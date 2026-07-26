import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Tour } from "@/src/domain/shared";
import { getSupabaseAdminClient } from "@/src/lib/supabase-admin";
import { DEFAULT_TOUR, getUpcomingOutputDir } from "@/src/lib/tour-config";

const BATCH_SIZE = 500;
const DEMO_SOURCE = "local-demo-feed";

async function readJsonLines<T>(filePath: string): Promise<T[]> {
  const content = await readFile(filePath, "utf8");
  return content
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

async function upsertBatches<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
  onConflict: string,
) {
  const client = getSupabaseAdminClient();

  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const batch = rows.slice(index, index + BATCH_SIZE);
    const { error } = await client.from(table).upsert(batch as Record<string, unknown>[], {
      onConflict,
      ignoreDuplicates: false,
    });

    if (error) {
      throw new Error(`Failed to upsert ${table} batch starting at ${index}: ${error.message}`);
    }
  }
}

type UpcomingMatchIdentityRow = {
  id: string;
  tour: Tour;
  external_match_id: string;
};

function upcomingMatchKey(tour: Tour, externalMatchId: string) {
  return `${tour}:${externalMatchId}`;
}

async function reconcileUpcomingMatchIds(
  matches: Record<string, unknown>[],
  features: Record<string, unknown>[],
  predictions: Record<string, unknown>[],
) {
  const client = getSupabaseAdminClient();
  const matchesByTour = new Map<Tour, string[]>();

  for (const row of matches) {
    const tour = row.tour;
    const externalMatchId = row.external_match_id;

    if (
      (tour !== "atp" && tour !== "wta") ||
      typeof externalMatchId !== "string" ||
      externalMatchId.length === 0
    ) {
      continue;
    }

    const current = matchesByTour.get(tour) ?? [];
    current.push(externalMatchId);
    matchesByTour.set(tour, current);
  }

  const existingRows: UpcomingMatchIdentityRow[] = [];

  for (const [existingTour, externalMatchIds] of matchesByTour) {
    for (let index = 0; index < externalMatchIds.length; index += BATCH_SIZE) {
      const batch = [...new Set(externalMatchIds.slice(index, index + BATCH_SIZE))];
      const { data, error } = await client
        .from("upcoming_matches")
        .select("id, tour, external_match_id")
        .eq("tour", existingTour)
        .in("external_match_id", batch);

      if (error) {
        throw new Error(`Failed to reconcile upcoming match IDs: ${error.message}`);
      }

      existingRows.push(...((data ?? []) as UpcomingMatchIdentityRow[]));
    }
  }

  const existingIdByKey = new Map(
    existingRows.map((row) => [upcomingMatchKey(row.tour, row.external_match_id), row.id]),
  );
  const remappedIds = new Map<string, string>();

  const reconciledMatches = matches.map((row) => {
    const tour = row.tour;
    const externalMatchId = row.external_match_id;
    const currentId = row.id;

    if (
      (tour !== "atp" && tour !== "wta") ||
      typeof externalMatchId !== "string" ||
      typeof currentId !== "string"
    ) {
      return row;
    }

    const existingId = existingIdByKey.get(upcomingMatchKey(tour, externalMatchId));
    if (!existingId || existingId === currentId) {
      return row;
    }

    remappedIds.set(currentId, existingId);
    return {
      ...row,
      id: existingId,
    };
  });

  const rewriteUpcomingMatchId = (row: Record<string, unknown>) => {
    const currentUpcomingMatchId = row.upcoming_match_id;
    if (typeof currentUpcomingMatchId !== "string") {
      return row;
    }

    const canonicalId = remappedIds.get(currentUpcomingMatchId);
    if (!canonicalId || canonicalId === currentUpcomingMatchId) {
      return row;
    }

    return {
      ...row,
      upcoming_match_id: canonicalId,
    };
  };

  return {
    matches: reconciledMatches,
    features: features.map(rewriteUpcomingMatchId),
    predictions: predictions.map(rewriteUpcomingMatchId),
  };
}

async function pruneStaleUpcomingMatches(rows: Record<string, unknown>[], tour: Tour) {
  const client = getSupabaseAdminClient();
  const activeIds = new Set(rows.map((row) => String(row.id)));
  const activeSources = new Set(rows.map((row) => String(row.source)));

  const pruneSources = new Set(activeSources);
  if ([...activeSources].some((source) => source !== DEMO_SOURCE)) {
    pruneSources.add(DEMO_SOURCE);
  }

  const { data, error } = await client
    .from("upcoming_matches")
    .select("id, source, status")
    .eq("tour", tour)
    .in("source", [...pruneSources]);

  if (error) {
    throw new Error(`Failed to load existing upcoming matches for pruning: ${error.message}`);
  }

  const staleIds =
    data
      ?.filter((row) => !activeIds.has(row.id) && row.status === "scheduled")
      .map((row) => row.id) ?? [];

  if (staleIds.length === 0) {
    return 0;
  }

  const { error: deleteError } = await client.from("upcoming_matches").delete().in("id", staleIds);

  if (deleteError) {
    throw new Error(`Failed to prune stale upcoming matches: ${deleteError.message}`);
  }

  return staleIds.length;
}

export async function loadUpcomingMatchPredictionsToSupabase(tour: Tour = DEFAULT_TOUR) {
  const upcomingDir = getUpcomingOutputDir(tour);
  const [rawMatches, rawFeatures, rawPredictions] = await Promise.all([
    readJsonLines<Record<string, unknown>>(path.join(upcomingDir, "upcoming_matches.jsonl")),
    readJsonLines<Record<string, unknown>>(
      path.join(upcomingDir, "upcoming_match_feature_snapshots.jsonl"),
    ),
    readJsonLines<Record<string, unknown>>(
      path.join(upcomingDir, "upcoming_match_predictions.jsonl"),
    ),
  ]);

  const { matches, features, predictions } = await reconcileUpcomingMatchIds(
    rawMatches,
    rawFeatures,
    rawPredictions,
  );

  const prunedUpcomingMatches = await pruneStaleUpcomingMatches(matches, tour);
  await upsertBatches("upcoming_matches", matches, "tour,external_match_id");
  await upsertBatches("upcoming_match_feature_snapshots", features, "upcoming_match_id");
  await upsertBatches("upcoming_match_predictions", predictions, "upcoming_match_id,model_version");

  return {
    upcomingMatchesLoaded: matches.length,
    upcomingFeatureRowsLoaded: features.length,
    upcomingPredictionRowsLoaded: predictions.length,
    prunedUpcomingMatches,
  };
}
