import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdminClient } from "../src/lib/supabase-admin";

const evaluationVersion = process.argv[2] ?? "baseline-v5";
const EVALUATION_DIR = path.join(process.cwd(), "work", "evaluation", evaluationVersion);
const UPSERT_BATCH_SIZE = 500;
const SELECT_BATCH_SIZE = 100;
const DELETE_BATCH_SIZE = 500;
const INSERT_BATCH_SIZE = 500;

type HistoricalPredictionRow = {
  match_id: string;
  model_version: string;
  generated_at: string;
  match_date: string;
  tournament_id: string;
  tournament_level: string;
  surface: string;
  player_a_id: string;
  player_b_id: string;
  favorite_player_id: string;
  actual_winner_id: string;
  actual_loser_id: string;
  player_a_win_probability: number;
  player_b_win_probability: number;
  confidence: number;
  result: "won" | "lost";
  player_a_actual_win: 0 | 1;
  favorite_win_probability: number;
  favorite_won: 0 | 1;
  log_loss: number;
  brier_score: number;
  explanation: Array<{
    key: string;
    label: string;
    weight: number;
    playerAValue: number;
    playerBValue: number;
    edgeToPlayerA: number;
    summary: string;
  }>;
};

type StoredPrediction = {
  id: string;
  match_id: string;
};

type BacktestSummary = {
  modelVersion: string;
  generatedAt: string;
  matchCount: number;
  dateRange: {
    from: string | null;
    to: string | null;
  };
  overall: {
    accuracy: number;
    logLoss: number;
    brierScore: number;
    averageConfidence: number;
    averageFavoriteWinProbability: number;
    favoriteWinRate: number;
  };
};

async function readJsonLines<T>(filePath: string): Promise<T[]> {
  const content = await readFile(filePath, "utf8");
  return content
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as T;
}

async function upsertBatches<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
  onConflict: string,
) {
  const client = getSupabaseAdminClient();

  for (let index = 0; index < rows.length; index += UPSERT_BATCH_SIZE) {
    const batch = rows.slice(index, index + UPSERT_BATCH_SIZE);
    const { error } = await client.from(table).upsert(batch as Record<string, unknown>[], {
      onConflict,
      ignoreDuplicates: false,
    });

    if (error) {
      throw new Error(`Failed to upsert ${table} batch starting at ${index}: ${error.message}`);
    }
  }
}

async function insertBatches<T extends Record<string, unknown>>(table: string, rows: T[]) {
  const client = getSupabaseAdminClient();

  for (let index = 0; index < rows.length; index += INSERT_BATCH_SIZE) {
    const batch = rows.slice(index, index + INSERT_BATCH_SIZE);
    const { error } = await client.from(table).insert(batch as Record<string, unknown>[]);

    if (error) {
      throw new Error(`Failed to insert ${table} batch starting at ${index}: ${error.message}`);
    }
  }
}

async function deletePredictionFactorBatches(predictionIds: string[]) {
  const client = getSupabaseAdminClient();

  for (let index = 0; index < predictionIds.length; index += DELETE_BATCH_SIZE) {
    const batch = predictionIds.slice(index, index + DELETE_BATCH_SIZE);
    const { error } = await client.from("prediction_factors").delete().in("prediction_id", batch);

    if (error) {
      throw new Error(
        `Failed to delete prediction_factors batch starting at ${index}: ${error.message}`,
      );
    }
  }
}

async function main() {
  const [rows, summary] = await Promise.all([
    readJsonLines<HistoricalPredictionRow>(path.join(EVALUATION_DIR, "historical_predictions.jsonl")),
    readJsonFile<BacktestSummary>(path.join(EVALUATION_DIR, "summary.json")),
  ]);

  const client = getSupabaseAdminClient();
  const runId = randomUUID();
  const runStartedAt = new Date().toISOString();

  const { error: runInsertError } = await client.from("model_runs").insert({
    id: runId,
    model_version: summary.modelVersion,
    run_started_at: runStartedAt,
    status: "running",
    matches_scored: rows.length,
    notes: `Historical ATP backtest ${summary.dateRange.from ?? "unknown"} to ${
      summary.dateRange.to ?? "unknown"
    } | accuracy=${summary.overall.accuracy} log_loss=${summary.overall.logLoss} brier=${summary.overall.brierScore}`,
  });

  if (runInsertError) {
    throw new Error(`Failed to insert model_run: ${runInsertError.message}`);
  }

  try {
    const predictions = rows.map((row) => ({
      match_id: row.match_id,
      model_version: row.model_version,
      generated_at: `${row.generated_at}T00:00:00.000Z`,
      favorite_player_id: row.favorite_player_id,
      player_a_id: row.player_a_id,
      player_b_id: row.player_b_id,
      player_a_win_probability: row.player_a_win_probability,
      player_b_win_probability: row.player_b_win_probability,
      confidence: row.confidence,
      result: row.result,
    }));

    await upsertBatches("predictions", predictions, "match_id,model_version");

    const matchIds = rows.map((row) => row.match_id);
    const storedPredictions: StoredPrediction[] = [];

    for (let index = 0; index < matchIds.length; index += SELECT_BATCH_SIZE) {
      const batch = matchIds.slice(index, index + SELECT_BATCH_SIZE);
      const { data, error } = await client
        .from("predictions")
        .select("id, match_id")
        .eq("model_version", summary.modelVersion)
        .in("match_id", batch);

      if (error) {
        throw new Error(`Failed to select predictions batch starting at ${index}: ${error.message}`);
      }

      storedPredictions.push(...((data ?? []) as StoredPrediction[]));
    }

    const predictionIdByMatchId = new Map(
      storedPredictions.map((prediction) => [prediction.match_id, prediction.id]),
    );
    const predictionIds = storedPredictions.map((prediction) => prediction.id);

    await deletePredictionFactorBatches(predictionIds);

    const factorRows = rows.flatMap((row) => {
      const predictionId = predictionIdByMatchId.get(row.match_id);
      if (!predictionId) {
        throw new Error(`Missing stored prediction id for match ${row.match_id}`);
      }

      return row.explanation.map((factor) => ({
        prediction_id: predictionId,
        factor_key: factor.key,
        factor_label: factor.label,
        factor_weight: factor.weight,
        player_a_value: factor.playerAValue,
        player_b_value: factor.playerBValue,
        edge_to_player_a: factor.edgeToPlayerA,
        explanation: factor.summary,
      }));
    });

    await insertBatches("prediction_factors", factorRows);

    const { error: completeError } = await client
      .from("model_runs")
      .update({
        run_completed_at: new Date().toISOString(),
        status: "completed",
        matches_scored: rows.length,
      })
      .eq("id", runId);

    if (completeError) {
      throw new Error(`Failed to complete model_run: ${completeError.message}`);
    }

    console.log(
      JSON.stringify(
        {
          modelRunId: runId,
          predictionsLoaded: rows.length,
          predictionFactorsLoaded: factorRows.length,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client
      .from("model_runs")
      .update({
        run_completed_at: new Date().toISOString(),
        status: "failed",
      })
      .eq("id", runId);

    throw error;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
