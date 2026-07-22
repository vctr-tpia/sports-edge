import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { TennisScheduleProvider } from "@/src/data/providers/tennis-provider";
import { normalizePersonName } from "@/src/lib/name-normalization";
import { getSupabaseAdminClient } from "@/src/lib/supabase-admin";

const OUTPUT_DIR = path.join(process.cwd(), "work", "automation", "daily-refresh");
const BATCH_SIZE = 25;

type RecentUpcomingMatch = {
  id: string;
  external_match_id: string;
  tournament_name: string;
  match_date: string;
  player_a_id: string;
  player_b_id: string;
  status: "scheduled" | "completed" | "cancelled";
  source: string;
};

type ProviderNameRow = {
  player_id: string;
  provider_player_name: string | null;
};

type PlayerRow = {
  id: string;
  full_name: string;
};

type SettlementUpdate = {
  id: string;
  status: "completed" | "cancelled";
  settled_at: string;
  settled_score: string | null;
  settled_winner_id: string | null;
  settlement_source: string;
  settlement_provider_status: string | null;
  settlement_event_id: string | null;
};

type ResultsIngestionSummary = {
  referenceDate: string;
  lookbackDate: string;
  scannedMatches: number;
  checkedMatches: number;
  completedMatches: number;
  cancelledMatches: number;
  unchangedMatches: number;
  unresolvedMatches: number;
  providerFailures: number;
  rateLimited: boolean;
  dryRun: boolean;
  updates: SettlementUpdate[];
};

function subtractDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapWinnerId(
  winnerSide: 1 | 2 | null,
  participant1Name: string,
  participant2Name: string,
  playerAId: string,
  playerBId: string,
  providerNameA: string,
  providerNameB: string,
) {
  if (!winnerSide) {
    return null;
  }

  const winnerName = winnerSide === 1 ? participant1Name : participant2Name;
  const normalizedWinnerName = normalizePersonName(winnerName);
  const normalizedProviderNameA = normalizePersonName(providerNameA);
  const normalizedProviderNameB = normalizePersonName(providerNameB);

  if (normalizedWinnerName === normalizedProviderNameA) {
    return playerAId;
  }
  if (normalizedWinnerName === normalizedProviderNameB) {
    return playerBId;
  }

  return null;
}

async function writeSummary(summary: ResultsIngestionSummary) {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(
    path.join(OUTPUT_DIR, "latest-results-ingestion-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );
}

export async function ingestRecentMatchResults({
  provider,
  referenceDate,
  lookbackDays = 2,
  dryRun = false,
}: {
  provider: TennisScheduleProvider;
  referenceDate: string;
  lookbackDays?: number;
  dryRun?: boolean;
}): Promise<ResultsIngestionSummary> {
  const client = getSupabaseAdminClient();
  const lookbackDate = subtractDays(referenceDate, lookbackDays);

  const { data: matches, error: matchesError } = await client
    .from("upcoming_matches")
    .select("id, external_match_id, tournament_name, match_date, player_a_id, player_b_id, status, source")
    .eq("source", "matchstat-rapidapi")
    .eq("status", "scheduled")
    .gte("match_date", lookbackDate)
    .lte("match_date", referenceDate)
    .order("match_date", { ascending: true });

  if (matchesError) {
    throw new Error(`Failed to load recent upcoming matches for settlement: ${matchesError.message}`);
  }

  const recentMatches = (matches ?? []) as RecentUpcomingMatch[];
  const playerIds = [...new Set(recentMatches.flatMap((match) => [match.player_a_id, match.player_b_id]))];

  const [providerNamesResult, playersResult] = await Promise.all([
    client
      .from("player_external_ids")
      .select("player_id, provider_player_name")
      .eq("provider", "matchstat-rapidapi")
      .in("player_id", playerIds),
    client.from("players").select("id, full_name").in("id", playerIds),
  ]);

  if (providerNamesResult.error) {
    throw new Error(`Failed to load provider player names: ${providerNamesResult.error.message}`);
  }
  if (playersResult.error) {
    throw new Error(`Failed to load player names: ${playersResult.error.message}`);
  }

  const providerNameByPlayerId = new Map(
    ((providerNamesResult.data ?? []) as ProviderNameRow[])
      .filter((row) => row.provider_player_name)
      .map((row) => [row.player_id, row.provider_player_name as string]),
  );
  const playerById = new Map(((playersResult.data ?? []) as PlayerRow[]).map((row) => [row.id, row]));

  const updates: SettlementUpdate[] = [];
  let checkedMatches = 0;
  let completedMatches = 0;
  let cancelledMatches = 0;
  let unchangedMatches = 0;
  let unresolvedMatches = 0;
  let providerFailures = 0;
  let rateLimited = false;

  outer: 
  for (let index = 0; index < recentMatches.length; index += BATCH_SIZE) {
    const batch = recentMatches.slice(index, index + BATCH_SIZE);

    for (const match of batch) {
      const providerNameA =
        providerNameByPlayerId.get(match.player_a_id) ?? playerById.get(match.player_a_id)?.full_name;
      const providerNameB =
        providerNameByPlayerId.get(match.player_b_id) ?? playerById.get(match.player_b_id)?.full_name;

      if (!providerNameA || !providerNameB) {
        unresolvedMatches += 1;
        continue;
      }

      let result;
      try {
        result = await provider.fetchMatchResult(providerNameA, providerNameB, match.match_date);
        checkedMatches += 1;
        await sleep(250);
      } catch (error) {
        providerFailures += 1;
        if (error instanceof Error && error.message.includes("429")) {
          rateLimited = true;
          break outer;
        }

        unresolvedMatches += 1;
        continue;
      }

      if (!result || result.status === "scheduled" || result.status === "in_progress") {
        unchangedMatches += 1;
        continue;
      }

      const settledAt = new Date().toISOString();
      const settledWinnerId =
        result.status === "completed"
          ? mapWinnerId(
              result.winnerSide,
              result.participant1Name,
              result.participant2Name,
              match.player_a_id,
              match.player_b_id,
              providerNameA,
              providerNameB,
            )
          : null;

      const update: SettlementUpdate = {
        id: match.id,
        status: result.status === "completed" ? "completed" : "cancelled",
        settled_at: settledAt,
        settled_score: result.score,
        settled_winner_id: settledWinnerId,
        settlement_source: result.provider,
        settlement_provider_status: result.providerStatus,
        settlement_event_id: result.providerEventId,
      };

      updates.push(update);
      if (update.status === "completed") {
        completedMatches += 1;
      } else {
        cancelledMatches += 1;
      }
    }
  }

  if (!dryRun) {
    for (const update of updates) {
      const { error } = await client
        .from("upcoming_matches")
        .update({
          status: update.status,
          settled_at: update.settled_at,
          settled_score: update.settled_score,
          settled_winner_id: update.settled_winner_id,
          settlement_source: update.settlement_source,
          settlement_provider_status: update.settlement_provider_status,
          settlement_event_id: update.settlement_event_id,
        })
        .eq("id", update.id);

      if (error) {
        throw new Error(`Failed to settle upcoming match ${update.id}: ${error.message}`);
      }
    }
  }

  const summary: ResultsIngestionSummary = {
    referenceDate,
    lookbackDate,
    scannedMatches: recentMatches.length,
    checkedMatches,
    completedMatches,
    cancelledMatches,
    unchangedMatches,
    unresolvedMatches,
    providerFailures,
    rateLimited,
    dryRun,
    updates,
  };

  await writeSummary(summary);
  return summary;
}
