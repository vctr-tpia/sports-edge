import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdminClient } from "@/src/lib/supabase-admin";

const UPCOMING_DIR = path.join(process.cwd(), "work", "upcoming", "atp");
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

async function pruneStaleUpcomingMatches(rows: Record<string, unknown>[]) {
  const client = getSupabaseAdminClient();
  const activeIds = new Set(rows.map((row) => String(row.id)));
  const activeSources = new Set(rows.map((row) => String(row.source)));

  const pruneSources = new Set(activeSources);
  if (activeSources.has("matchstat-rapidapi")) {
    pruneSources.add(DEMO_SOURCE);
  }

  const { data, error } = await client
    .from("upcoming_matches")
    .select("id, source, status")
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

export async function loadUpcomingMatchPredictionsToSupabase() {
  const [matches, features, predictions] = await Promise.all([
    readJsonLines<Record<string, unknown>>(path.join(UPCOMING_DIR, "upcoming_matches.jsonl")),
    readJsonLines<Record<string, unknown>>(
      path.join(UPCOMING_DIR, "upcoming_match_feature_snapshots.jsonl"),
    ),
    readJsonLines<Record<string, unknown>>(
      path.join(UPCOMING_DIR, "upcoming_match_predictions.jsonl"),
    ),
  ]);

  const prunedUpcomingMatches = await pruneStaleUpcomingMatches(matches);
  await upsertBatches("upcoming_matches", matches, "id");
  await upsertBatches("upcoming_match_feature_snapshots", features, "upcoming_match_id");
  await upsertBatches("upcoming_match_predictions", predictions, "upcoming_match_id,model_version");

  return {
    upcomingMatchesLoaded: matches.length,
    upcomingFeatureRowsLoaded: features.length,
    upcomingPredictionRowsLoaded: predictions.length,
    prunedUpcomingMatches,
  };
}
