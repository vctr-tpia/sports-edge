import { appendFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PredictionFactor } from "@/src/domain/predictions/explanation";
import type { PreMatchFeatureSnapshot } from "@/src/domain/predictions/feature-snapshot";
import { getSupabaseAdminClient } from "@/src/lib/supabase-admin";
import { generatePredictionFromFeatureSnapshot } from "@/src/prediction/baseline-feature-model";

const OUTPUT_DIR = path.join(process.cwd(), "work", "automation", "prediction-ledger");
const BATCH_SIZE = 200;

type NumericLike = number | string | null | undefined;

type UpcomingMatchRow = {
  id: string;
  external_match_id: string | null;
  external_tournament_id: string;
  tournament_name: string;
  season: number;
  country_code: string | null;
  city: string | null;
  surface: "clay" | "hard" | "grass";
  tournament_level:
    | "grand_slam"
    | "masters"
    | "atp_500"
    | "atp_250"
    | "challenger";
  match_date: string;
  scheduled_at: string | null;
  provider_time_label: string | null;
  tournament_start_date: string | null;
  tournament_end_date: string | null;
  round: "R128" | "R64" | "R32" | "R16" | "QF" | "SF" | "F";
  best_of: number | null;
  player_a_id: string;
  player_b_id: string;
  source: string;
  status: "completed" | "cancelled";
  settled_at: string | null;
  settled_score: string | null;
  settled_winner_id: string | null;
  settlement_source: string | null;
  settlement_provider_status: string | null;
  settlement_event_id: string | null;
};

type UpcomingPredictionRow = {
  upcoming_match_id: string;
  model_version: string;
  generated_at: string;
  favorite_player_id: string;
  player_a_id: string;
  player_b_id: string;
  player_a_win_probability: NumericLike;
  player_b_win_probability: NumericLike;
  confidence: NumericLike;
  expected_total_sets: NumericLike;
  expected_total_games: NumericLike;
  favorite_straight_sets_probability: NumericLike;
  deciding_set_probability: NumericLike;
};

type UpcomingSnapshotRow = {
  upcoming_match_id: string;
  feature_version: string;
  match_date: string;
  surface: "clay" | "hard" | "grass";
  tournament_level:
    | "grand_slam"
    | "masters"
    | "atp_500"
    | "atp_250"
    | "challenger";
  round: "R128" | "R64" | "R32" | "R16" | "QF" | "SF" | "F";
  player_a_id: string;
  player_b_id: string;
  player_a_overall_elo: NumericLike;
  player_b_overall_elo: NumericLike;
  player_a_surface_elo: NumericLike;
  player_b_surface_elo: NumericLike;
  player_a_recent_form: NumericLike;
  player_b_recent_form: NumericLike;
  player_a_surface_recent_form: NumericLike;
  player_b_surface_recent_form: NumericLike;
  player_a_surface_service_points_won: NumericLike;
  player_b_surface_service_points_won: NumericLike;
  player_a_surface_return_points_won: NumericLike;
  player_b_surface_return_points_won: NumericLike;
  player_a_surface_win_rate: NumericLike;
  player_b_surface_win_rate: NumericLike;
  player_a_opponent_quality: NumericLike;
  player_b_opponent_quality: NumericLike;
  player_a_rest_days: number | null;
  player_b_rest_days: number | null;
  player_a_h2h_wins: number;
  player_b_h2h_wins: number;
  player_a_overall_elo_edge: NumericLike;
  player_a_surface_elo_edge: NumericLike;
  player_a_recent_form_edge: NumericLike;
  player_a_surface_recent_form_edge: NumericLike;
  player_a_surface_service_points_won_edge: NumericLike;
  player_a_surface_return_points_won_edge: NumericLike;
  player_a_surface_win_rate_edge: NumericLike;
  player_a_opponent_quality_edge: NumericLike;
  player_a_rest_days_edge: number | null;
  player_a_h2h_edge: number;
};

type PlayerRow = {
  id: string;
  full_name: string;
  country_code: string | null;
};

type ExistingLedgerKeyRow = {
  source_upcoming_match_id: string;
  model_version: string;
};

type LedgerInsertRow = Record<string, string | number | null>;

type InsertedLedgerRow = {
  id: string;
  source_upcoming_match_id: string;
  model_version: string;
};

type LedgerFactorInsertRow = {
  ledger_entry_id: string;
  factor_key: string;
  factor_label: string;
  factor_weight: number;
  player_a_value: number;
  player_b_value: number;
  edge_to_player_a: number;
  explanation: string;
};

export type PredictionLedgerArchiveSummary = {
  referenceDate: string;
  settledMatchesScanned: number;
  eligiblePredictionRows: number;
  archivedEntries: number;
  archivedFactors: number;
  skippedExisting: number;
  retainedUnarchivedMatches: number;
  prunedMatches: number;
  voidPredictions: number;
};

function toNumber(value: NumericLike, fallback = 0) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value === "number") {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function chunk<T>(rows: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    result.push(rows.slice(index, index + size));
  }
  return result;
}

function makeLedgerKey(matchId: string, modelVersion: string) {
  return `${matchId}::${modelVersion}`;
}

function buildSnapshot(match: UpcomingMatchRow, snapshot: UpcomingSnapshotRow): PreMatchFeatureSnapshot {
  return {
    matchId: match.id,
    featureVersion: snapshot.feature_version,
    matchDate: snapshot.match_date,
    tournamentId: match.external_tournament_id,
    tournamentLevel: snapshot.tournament_level,
    bestOf: match.best_of,
    surface: snapshot.surface,
    round: snapshot.round,
    playerAId: snapshot.player_a_id,
    playerBId: snapshot.player_b_id,
    playerAOverallElo: toNumber(snapshot.player_a_overall_elo),
    playerBOverallElo: toNumber(snapshot.player_b_overall_elo),
    playerASurfaceElo: toNumber(snapshot.player_a_surface_elo),
    playerBSurfaceElo: toNumber(snapshot.player_b_surface_elo),
    playerARecentForm: toNumber(snapshot.player_a_recent_form),
    playerBRecentForm: toNumber(snapshot.player_b_recent_form),
    playerASurfaceRecentForm:
      snapshot.player_a_surface_recent_form === null
        ? undefined
        : toNumber(snapshot.player_a_surface_recent_form),
    playerBSurfaceRecentForm:
      snapshot.player_b_surface_recent_form === null
        ? undefined
        : toNumber(snapshot.player_b_surface_recent_form),
    playerASurfaceServicePointsWon:
      snapshot.player_a_surface_service_points_won === null
        ? undefined
        : toNumber(snapshot.player_a_surface_service_points_won),
    playerBSurfaceServicePointsWon:
      snapshot.player_b_surface_service_points_won === null
        ? undefined
        : toNumber(snapshot.player_b_surface_service_points_won),
    playerASurfaceReturnPointsWon:
      snapshot.player_a_surface_return_points_won === null
        ? undefined
        : toNumber(snapshot.player_a_surface_return_points_won),
    playerBSurfaceReturnPointsWon:
      snapshot.player_b_surface_return_points_won === null
        ? undefined
        : toNumber(snapshot.player_b_surface_return_points_won),
    playerASurfaceWinRate: toNumber(snapshot.player_a_surface_win_rate),
    playerBSurfaceWinRate: toNumber(snapshot.player_b_surface_win_rate),
    playerAOpponentQuality: toNumber(snapshot.player_a_opponent_quality),
    playerBOpponentQuality: toNumber(snapshot.player_b_opponent_quality),
    playerARestDays: snapshot.player_a_rest_days,
    playerBRestDays: snapshot.player_b_rest_days,
    playerAH2HWins: snapshot.player_a_h2h_wins,
    playerBH2HWins: snapshot.player_b_h2h_wins,
    playerAOverallEloEdge: toNumber(snapshot.player_a_overall_elo_edge),
    playerASurfaceEloEdge: toNumber(snapshot.player_a_surface_elo_edge),
    playerARecentFormEdge: toNumber(snapshot.player_a_recent_form_edge),
    playerASurfaceRecentFormEdge:
      snapshot.player_a_surface_recent_form_edge === null
        ? undefined
        : toNumber(snapshot.player_a_surface_recent_form_edge),
    playerASurfaceServicePointsWonEdge:
      snapshot.player_a_surface_service_points_won_edge === null
        ? undefined
        : toNumber(snapshot.player_a_surface_service_points_won_edge),
    playerASurfaceReturnPointsWonEdge:
      snapshot.player_a_surface_return_points_won_edge === null
        ? undefined
        : toNumber(snapshot.player_a_surface_return_points_won_edge),
    playerASurfaceWinRateEdge: toNumber(snapshot.player_a_surface_win_rate_edge),
    playerAOpponentQualityEdge: toNumber(snapshot.player_a_opponent_quality_edge),
    playerARestDaysEdge: snapshot.player_a_rest_days_edge,
    playerAH2HEdge: snapshot.player_a_h2h_edge,
  };
}

function predictionResult(match: UpcomingMatchRow, prediction: UpcomingPredictionRow) {
  if (match.status === "cancelled" || !match.settled_winner_id) {
    return "void";
  }

  return prediction.favorite_player_id === match.settled_winner_id ? "won" : "lost";
}

function favoritePlayerName(prediction: UpcomingPredictionRow, playersById: Map<string, PlayerRow>) {
  return playersById.get(prediction.favorite_player_id)?.full_name ?? prediction.favorite_player_id;
}

function settledWinnerName(match: UpcomingMatchRow, playersById: Map<string, PlayerRow>) {
  if (!match.settled_winner_id) {
    return null;
  }

  return playersById.get(match.settled_winner_id)?.full_name ?? match.settled_winner_id;
}

function factorRowsForEntry(
  ledgerEntryId: string,
  explanation: PredictionFactor[],
): LedgerFactorInsertRow[] {
  return explanation.map((factor) => ({
    ledger_entry_id: ledgerEntryId,
    factor_key: factor.key,
    factor_label: factor.label,
    factor_weight: factor.weight,
    player_a_value: factor.playerAValue,
    player_b_value: factor.playerBValue,
    edge_to_player_a: factor.edgeToPlayerA,
    explanation: factor.summary,
  }));
}

async function writeSummary(summary: PredictionLedgerArchiveSummary) {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(
    path.join(OUTPUT_DIR, "latest-prediction-ledger-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );
}

async function writeGitHubSummary(summary: PredictionLedgerArchiveSummary) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) {
    return;
  }

  const lines = [
    "## Prediction Ledger Archive",
    "",
    `- Reference date: ${summary.referenceDate}`,
    `- Settled matches scanned: ${summary.settledMatchesScanned}`,
    `- Eligible prediction rows: ${summary.eligiblePredictionRows}`,
    `- Archived entries: ${summary.archivedEntries}`,
    `- Archived factor rows: ${summary.archivedFactors}`,
    `- Skipped existing entries: ${summary.skippedExisting}`,
    `- Pruned live upcoming matches: ${summary.prunedMatches}`,
    `- Retained live settled matches: ${summary.retainedUnarchivedMatches}`,
    `- Void predictions archived: ${summary.voidPredictions}`,
    "",
  ];

  await appendFile(summaryPath, `${lines.join("\n")}\n`, "utf8");
}

export async function archiveSettledPredictionLedger(
  referenceDate = new Date().toISOString().slice(0, 10),
): Promise<PredictionLedgerArchiveSummary> {
  const client = getSupabaseAdminClient();
  const { data: matchesData, error: matchesError } = await client
    .from("upcoming_matches")
    .select(
      "id,external_match_id,external_tournament_id,tournament_name,season,country_code,city,surface,tournament_level,match_date,scheduled_at,provider_time_label,tournament_start_date,tournament_end_date,round,best_of,player_a_id,player_b_id,source,status,settled_at,settled_score,settled_winner_id,settlement_source,settlement_provider_status,settlement_event_id",
    )
    .in("status", ["completed", "cancelled"])
    .not("settled_at", "is", null)
    .order("settled_at", { ascending: false });

  if (matchesError) {
    throw new Error(`Failed to load settled upcoming matches for ledger archival: ${matchesError.message}`);
  }

  const settledMatches = (matchesData ?? []) as UpcomingMatchRow[];
  if (settledMatches.length === 0) {
    const emptySummary: PredictionLedgerArchiveSummary = {
      referenceDate,
      settledMatchesScanned: 0,
      eligiblePredictionRows: 0,
      archivedEntries: 0,
      archivedFactors: 0,
      skippedExisting: 0,
      retainedUnarchivedMatches: 0,
      prunedMatches: 0,
      voidPredictions: 0,
    };
    await writeSummary(emptySummary);
    await writeGitHubSummary(emptySummary);
    return emptySummary;
  }

  const matchIds = settledMatches.map((match) => match.id);
  const playerIds = [...new Set(settledMatches.flatMap((match) => [match.player_a_id, match.player_b_id, match.settled_winner_id].filter(Boolean) as string[]))];

  const [predictionsResult, snapshotsResult, playersResult, existingResult] = await Promise.all([
    client
      .from("upcoming_match_predictions")
      .select(
        "upcoming_match_id,model_version,generated_at,favorite_player_id,player_a_id,player_b_id,player_a_win_probability,player_b_win_probability,confidence,expected_total_sets,expected_total_games,favorite_straight_sets_probability,deciding_set_probability",
      )
      .in("upcoming_match_id", matchIds),
    client
      .from("upcoming_match_feature_snapshots")
      .select(
        "upcoming_match_id,feature_version,match_date,surface,tournament_level,round,player_a_id,player_b_id,player_a_overall_elo,player_b_overall_elo,player_a_surface_elo,player_b_surface_elo,player_a_recent_form,player_b_recent_form,player_a_surface_recent_form,player_b_surface_recent_form,player_a_surface_service_points_won,player_b_surface_service_points_won,player_a_surface_return_points_won,player_b_surface_return_points_won,player_a_surface_win_rate,player_b_surface_win_rate,player_a_opponent_quality,player_b_opponent_quality,player_a_rest_days,player_b_rest_days,player_a_h2h_wins,player_b_h2h_wins,player_a_overall_elo_edge,player_a_surface_elo_edge,player_a_recent_form_edge,player_a_surface_recent_form_edge,player_a_surface_service_points_won_edge,player_a_surface_return_points_won_edge,player_a_surface_win_rate_edge,player_a_opponent_quality_edge,player_a_rest_days_edge,player_a_h2h_edge",
      )
      .in("upcoming_match_id", matchIds),
    client.from("players").select("id,full_name,country_code").in("id", playerIds),
    client
      .from("prediction_ledger_entries")
      .select("source_upcoming_match_id,model_version")
      .in("source_upcoming_match_id", matchIds),
  ]);

  if (predictionsResult.error) {
    throw new Error(`Failed to load upcoming match predictions for archival: ${predictionsResult.error.message}`);
  }
  if (snapshotsResult.error) {
    throw new Error(`Failed to load upcoming feature snapshots for archival: ${snapshotsResult.error.message}`);
  }
  if (playersResult.error) {
    throw new Error(`Failed to load player identities for archival: ${playersResult.error.message}`);
  }
  if (existingResult.error) {
    throw new Error(`Failed to load existing ledger entries: ${existingResult.error.message}`);
  }

  const predictions = (predictionsResult.data ?? []) as UpcomingPredictionRow[];
  const snapshots = (snapshotsResult.data ?? []) as UpcomingSnapshotRow[];
  const players = (playersResult.data ?? []) as PlayerRow[];
  const existingKeys = new Set(
    ((existingResult.data ?? []) as ExistingLedgerKeyRow[]).map((row) =>
      makeLedgerKey(row.source_upcoming_match_id, row.model_version),
    ),
  );

  const matchById = new Map(settledMatches.map((match) => [match.id, match]));
  const snapshotByMatchId = new Map(snapshots.map((snapshot) => [snapshot.upcoming_match_id, snapshot]));
  const playersById = new Map(players.map((player) => [player.id, player]));

  const entriesToArchive: Array<{
    key: string;
    row: LedgerInsertRow;
    explanation: PredictionFactor[];
    matchId: string;
  }> = [];
  let skippedExisting = 0;
  let voidPredictions = 0;

  for (const prediction of predictions) {
    const key = makeLedgerKey(prediction.upcoming_match_id, prediction.model_version);
    if (existingKeys.has(key)) {
      skippedExisting += 1;
      continue;
    }

    const match = matchById.get(prediction.upcoming_match_id);
    const snapshot = snapshotByMatchId.get(prediction.upcoming_match_id);
    if (!match || !snapshot) {
      continue;
    }

    const featureSnapshot = buildSnapshot(match, snapshot);
    const regenerated = generatePredictionFromFeatureSnapshot(featureSnapshot);
    const archivedResult = predictionResult(match, prediction);
    if (archivedResult === "void") {
      voidPredictions += 1;
    }

    const playerA = playersById.get(match.player_a_id);
    const playerB = playersById.get(match.player_b_id);

    entriesToArchive.push({
      key,
      matchId: match.id,
      explanation: regenerated.explanation,
      row: {
        source_upcoming_match_id: match.id,
        external_match_id: match.external_match_id,
        external_tournament_id: match.external_tournament_id,
        tournament_name: match.tournament_name,
        season: match.season,
        country_code: match.country_code,
        city: match.city,
        surface: match.surface,
        tournament_level: match.tournament_level,
        match_date: match.match_date,
        scheduled_at: match.scheduled_at,
        provider_time_label: match.provider_time_label,
        tournament_start_date: match.tournament_start_date,
        tournament_end_date: match.tournament_end_date,
        round: match.round,
        best_of: match.best_of,
        source: match.source,
        match_status: match.status,
        player_a_id: match.player_a_id,
        player_b_id: match.player_b_id,
        player_a_name: playerA?.full_name ?? match.player_a_id,
        player_b_name: playerB?.full_name ?? match.player_b_id,
        player_a_country_code: playerA?.country_code ?? null,
        player_b_country_code: playerB?.country_code ?? null,
        feature_version: snapshot.feature_version,
        player_a_overall_elo: toNumber(snapshot.player_a_overall_elo),
        player_b_overall_elo: toNumber(snapshot.player_b_overall_elo),
        player_a_surface_elo: toNumber(snapshot.player_a_surface_elo),
        player_b_surface_elo: toNumber(snapshot.player_b_surface_elo),
        player_a_recent_form: toNumber(snapshot.player_a_recent_form),
        player_b_recent_form: toNumber(snapshot.player_b_recent_form),
        player_a_surface_recent_form:
          snapshot.player_a_surface_recent_form === null
            ? null
            : toNumber(snapshot.player_a_surface_recent_form),
        player_b_surface_recent_form:
          snapshot.player_b_surface_recent_form === null
            ? null
            : toNumber(snapshot.player_b_surface_recent_form),
        player_a_surface_service_points_won:
          snapshot.player_a_surface_service_points_won === null
            ? null
            : toNumber(snapshot.player_a_surface_service_points_won),
        player_b_surface_service_points_won:
          snapshot.player_b_surface_service_points_won === null
            ? null
            : toNumber(snapshot.player_b_surface_service_points_won),
        player_a_surface_return_points_won:
          snapshot.player_a_surface_return_points_won === null
            ? null
            : toNumber(snapshot.player_a_surface_return_points_won),
        player_b_surface_return_points_won:
          snapshot.player_b_surface_return_points_won === null
            ? null
            : toNumber(snapshot.player_b_surface_return_points_won),
        player_a_surface_win_rate: toNumber(snapshot.player_a_surface_win_rate),
        player_b_surface_win_rate: toNumber(snapshot.player_b_surface_win_rate),
        player_a_opponent_quality: toNumber(snapshot.player_a_opponent_quality),
        player_b_opponent_quality: toNumber(snapshot.player_b_opponent_quality),
        player_a_rest_days: snapshot.player_a_rest_days,
        player_b_rest_days: snapshot.player_b_rest_days,
        player_a_h2h_wins: snapshot.player_a_h2h_wins,
        player_b_h2h_wins: snapshot.player_b_h2h_wins,
        player_a_overall_elo_edge: toNumber(snapshot.player_a_overall_elo_edge),
        player_a_surface_elo_edge: toNumber(snapshot.player_a_surface_elo_edge),
        player_a_recent_form_edge: toNumber(snapshot.player_a_recent_form_edge),
        player_a_surface_recent_form_edge:
          snapshot.player_a_surface_recent_form_edge === null
            ? null
            : toNumber(snapshot.player_a_surface_recent_form_edge),
        player_a_surface_service_points_won_edge:
          snapshot.player_a_surface_service_points_won_edge === null
            ? null
            : toNumber(snapshot.player_a_surface_service_points_won_edge),
        player_a_surface_return_points_won_edge:
          snapshot.player_a_surface_return_points_won_edge === null
            ? null
            : toNumber(snapshot.player_a_surface_return_points_won_edge),
        player_a_surface_win_rate_edge: toNumber(snapshot.player_a_surface_win_rate_edge),
        player_a_opponent_quality_edge: toNumber(snapshot.player_a_opponent_quality_edge),
        player_a_rest_days_edge: snapshot.player_a_rest_days_edge,
        player_a_h2h_edge: snapshot.player_a_h2h_edge,
        model_version: prediction.model_version,
        generated_at: prediction.generated_at,
        favorite_player_id: prediction.favorite_player_id,
        favorite_player_name: favoritePlayerName(prediction, playersById),
        player_a_win_probability: toNumber(prediction.player_a_win_probability),
        player_b_win_probability: toNumber(prediction.player_b_win_probability),
        confidence: toNumber(prediction.confidence),
        expected_total_sets: toNumber(prediction.expected_total_sets),
        expected_total_games: toNumber(prediction.expected_total_games),
        favorite_straight_sets_probability: toNumber(prediction.favorite_straight_sets_probability),
        deciding_set_probability: toNumber(prediction.deciding_set_probability),
        settled_at: match.settled_at,
        settled_score: match.settled_score,
        settled_winner_id: match.settled_winner_id,
        settled_winner_name: settledWinnerName(match, playersById),
        settlement_source: match.settlement_source,
        settlement_provider_status: match.settlement_provider_status,
        settlement_event_id: match.settlement_event_id,
        prediction_result: archivedResult,
        archived_at: new Date().toISOString(),
      },
    });
  }

  const insertedLedgerRows: InsertedLedgerRow[] = [];
  for (const batch of chunk(entriesToArchive, BATCH_SIZE)) {
    const { data, error } = await client
      .from("prediction_ledger_entries")
      .upsert(
        batch.map((entry) => entry.row),
        {
          onConflict: "source_upcoming_match_id,model_version",
          ignoreDuplicates: false,
        },
      )
      .select("id,source_upcoming_match_id,model_version");

    if (error) {
      throw new Error(`Failed to upsert prediction ledger entries: ${error.message}`);
    }

    insertedLedgerRows.push(...((data ?? []) as InsertedLedgerRow[]));
  }

  const insertedIdByKey = new Map(
    insertedLedgerRows.map((row) => [makeLedgerKey(row.source_upcoming_match_id, row.model_version), row.id]),
  );
  const factorRows = entriesToArchive.flatMap((entry) => {
    const ledgerEntryId = insertedIdByKey.get(entry.key);
    return ledgerEntryId ? factorRowsForEntry(ledgerEntryId, entry.explanation) : [];
  });

  if (insertedLedgerRows.length > 0) {
    const insertedIds = insertedLedgerRows.map((row) => row.id);
    const { error: deleteFactorsError } = await client
      .from("prediction_ledger_factors")
      .delete()
      .in("ledger_entry_id", insertedIds);

    if (deleteFactorsError) {
      throw new Error(`Failed to refresh prediction ledger factor rows: ${deleteFactorsError.message}`);
    }

    for (const batch of chunk(factorRows, BATCH_SIZE)) {
      const { error } = await client.from("prediction_ledger_factors").insert(batch);
      if (error) {
        throw new Error(`Failed to insert prediction ledger factors: ${error.message}`);
      }
    }
  }

  const archivedKeys = new Set(existingKeys);
  for (const row of insertedLedgerRows) {
    archivedKeys.add(makeLedgerKey(row.source_upcoming_match_id, row.model_version));
  }

  const predictionsByMatchId = new Map<string, UpcomingPredictionRow[]>();
  for (const prediction of predictions) {
    predictionsByMatchId.set(prediction.upcoming_match_id, [
      ...(predictionsByMatchId.get(prediction.upcoming_match_id) ?? []),
      prediction,
    ]);
  }

  const pruneMatchIds = settledMatches
    .filter((match) => {
      const matchPredictions = predictionsByMatchId.get(match.id) ?? [];
      if (matchPredictions.length === 0 || !snapshotByMatchId.has(match.id)) {
        return false;
      }

      return matchPredictions.every((prediction) =>
        archivedKeys.has(makeLedgerKey(prediction.upcoming_match_id, prediction.model_version)),
      );
    })
    .map((match) => match.id);

  if (pruneMatchIds.length > 0) {
    for (const batch of chunk(pruneMatchIds, BATCH_SIZE)) {
      const { error } = await client.from("upcoming_matches").delete().in("id", batch);
      if (error) {
        throw new Error(`Failed to prune archived upcoming matches: ${error.message}`);
      }
    }
  }

  const summary: PredictionLedgerArchiveSummary = {
    referenceDate,
    settledMatchesScanned: settledMatches.length,
    eligiblePredictionRows: entriesToArchive.length + skippedExisting,
    archivedEntries: insertedLedgerRows.length,
    archivedFactors: factorRows.length,
    skippedExisting,
    retainedUnarchivedMatches: settledMatches.length - pruneMatchIds.length,
    prunedMatches: pruneMatchIds.length,
    voidPredictions,
  };

  await writeSummary(summary);
  await writeGitHubSummary(summary);

  return summary;
}
