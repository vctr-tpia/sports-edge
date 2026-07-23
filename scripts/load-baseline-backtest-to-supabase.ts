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
    calibrationError: number;
    averageConfidence: number;
    averageFavoriteWinProbability: number;
    favoriteWinRate: number;
  };
  calibrationBuckets: Array<{
    bucketLabel: string;
    probabilityFrom: number;
    probabilityTo: number;
    matchCount: number;
    averagePredictedWinProbability: number;
    actualFavoriteWinRate: number;
    averageConfidence: number;
  }>;
  bySurface: SegmentSummaryRow[];
  byTournamentLevel: SegmentSummaryRow[];
  byBestOf: SegmentSummaryRow[];
  byRankingGapBucket: SegmentSummaryRow[];
  byFavoriteProbabilityBucket: SegmentSummaryRow[];
  bySeason: SegmentSummaryRow[];
  comparisonOverview: ComparisonOverviewRow[];
  comparisonBestByMetric: {
    accuracy: string;
    logLoss: string;
    brierScore: string;
    calibrationError: string;
  };
  ablationOverview: AblationOverviewRow[];
  notes: string[];
};

type SegmentSummaryRow = {
  segment: string;
  matchCount: number;
  accuracy: number;
  logLoss: number;
  brierScore: number;
  averageConfidence: number;
};

type ComparisonOverviewRow = {
  modelVersion: string;
  modelFamily: "full_model" | "benchmark" | "ablation";
  matchCount: number;
  accuracy: number;
  logLoss: number;
  brierScore: number;
  calibrationError: number;
  averageConfidence: number;
  averageFavoriteWinProbability: number;
  favoriteWinRate: number;
};

type SegmentComparisonRow = SegmentSummaryRow & {
  modelVersion: string;
  modelFamily: "full_model" | "benchmark" | "ablation";
};

type SegmentComparison = {
  segment: string;
  rows: SegmentComparisonRow[];
};

type AblationOverviewRow = {
  omittedFactor: string;
  omittedLabel: string;
  matchCount: number;
  accuracy: number;
  logLoss: number;
  brierScore: number;
  calibrationError: number;
  averageConfidence: number;
  accuracyDeltaVsPrimary: number;
  logLossDeltaVsPrimary: number;
  brierDeltaVsPrimary: number;
  calibrationDeltaVsPrimary: number;
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

async function readJsonFileOrDefault<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    return await readJsonFile<T>(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return defaultValue;
    }

    throw error;
  }
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

async function deleteEvaluationChildren(evaluationId: string) {
  const client = getSupabaseAdminClient();
  const tables = [
    "model_evaluation_segment_comparisons",
    "model_evaluation_segments",
    "model_evaluation_comparisons",
    "model_evaluation_calibration_buckets",
    "model_evaluation_ablations",
  ];

  for (const table of tables) {
    const { error } = await client.from(table).delete().eq("evaluation_id", evaluationId);
    if (error) {
      throw new Error(`Failed to delete ${table} rows for ${evaluationId}: ${error.message}`);
    }
  }
}

async function main() {
  const [
    rows,
    summary,
    comparisonBySurface,
    comparisonByTournamentLevel,
    comparisonByBestOf,
  ] = await Promise.all([
    readJsonLines<HistoricalPredictionRow>(path.join(EVALUATION_DIR, "historical_predictions.jsonl")),
    readJsonFile<BacktestSummary>(path.join(EVALUATION_DIR, "summary.json")),
    readJsonFileOrDefault<SegmentComparison[]>(
      path.join(EVALUATION_DIR, "comparison_by_surface.json"),
      [],
    ),
    readJsonFileOrDefault<SegmentComparison[]>(
      path.join(EVALUATION_DIR, "comparison_by_tournament_level.json"),
      [],
    ),
    readJsonFileOrDefault<SegmentComparison[]>(
      path.join(EVALUATION_DIR, "comparison_by_best_of.json"),
      [],
    ),
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
    } | accuracy=${summary.overall.accuracy} log_loss=${summary.overall.logLoss} brier=${summary.overall.brierScore} calibration=${summary.overall.calibrationError}`,
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

    const { data: evaluationRow, error: evaluationUpsertError } = await client
      .from("model_evaluations")
      .upsert(
        {
          model_run_id: runId,
          evaluation_version: evaluationVersion,
          primary_model_version: summary.modelVersion,
          generated_at: summary.generatedAt,
          sample_match_count: summary.matchCount,
          sample_date_from: summary.dateRange.from,
          sample_date_to: summary.dateRange.to,
          overall_accuracy: summary.overall.accuracy,
          overall_log_loss: summary.overall.logLoss,
          overall_brier_score: summary.overall.brierScore,
          overall_calibration_error: summary.overall.calibrationError,
          overall_average_confidence: summary.overall.averageConfidence,
          overall_average_favorite_win_probability:
            summary.overall.averageFavoriteWinProbability,
          overall_favorite_win_rate: summary.overall.favoriteWinRate,
          best_accuracy_model_version: summary.comparisonBestByMetric.accuracy,
          best_log_loss_model_version: summary.comparisonBestByMetric.logLoss,
          best_brier_model_version: summary.comparisonBestByMetric.brierScore,
          best_calibration_model_version: summary.comparisonBestByMetric.calibrationError,
          notes: summary.notes,
        },
        {
          onConflict: "evaluation_version",
          ignoreDuplicates: false,
        },
      )
      .select("id")
      .single();

    if (evaluationUpsertError || !evaluationRow) {
      throw new Error(
        `Failed to upsert model_evaluations row: ${evaluationUpsertError?.message ?? "unknown error"}`,
      );
    }

    await deleteEvaluationChildren(evaluationRow.id);

    const calibrationRows = summary.calibrationBuckets.map((bucket, index) => ({
      evaluation_id: evaluationRow.id,
      sort_order: index,
      bucket_label: bucket.bucketLabel,
      probability_from: bucket.probabilityFrom,
      probability_to: bucket.probabilityTo,
      match_count: bucket.matchCount,
      average_predicted_win_probability: bucket.averagePredictedWinProbability,
      actual_favorite_win_rate: bucket.actualFavoriteWinRate,
      average_confidence: bucket.averageConfidence,
    }));

    const segmentRows = [
      ...summary.bySurface.map((segment, index) => ({
        evaluation_id: evaluationRow.id,
        segment_type: "surface",
        segment_key: segment.segment,
        sort_order: index,
        match_count: segment.matchCount,
        accuracy: segment.accuracy,
        log_loss: segment.logLoss,
        brier_score: segment.brierScore,
        average_confidence: segment.averageConfidence,
      })),
      ...summary.byTournamentLevel.map((segment, index) => ({
        evaluation_id: evaluationRow.id,
        segment_type: "tournament_level",
        segment_key: segment.segment,
        sort_order: index,
        match_count: segment.matchCount,
        accuracy: segment.accuracy,
        log_loss: segment.logLoss,
        brier_score: segment.brierScore,
        average_confidence: segment.averageConfidence,
      })),
      ...summary.byBestOf.map((segment, index) => ({
        evaluation_id: evaluationRow.id,
        segment_type: "best_of",
        segment_key: segment.segment,
        sort_order: index,
        match_count: segment.matchCount,
        accuracy: segment.accuracy,
        log_loss: segment.logLoss,
        brier_score: segment.brierScore,
        average_confidence: segment.averageConfidence,
      })),
      ...summary.byRankingGapBucket.map((segment, index) => ({
        evaluation_id: evaluationRow.id,
        segment_type: "ranking_gap_bucket",
        segment_key: segment.segment,
        sort_order: index,
        match_count: segment.matchCount,
        accuracy: segment.accuracy,
        log_loss: segment.logLoss,
        brier_score: segment.brierScore,
        average_confidence: segment.averageConfidence,
      })),
      ...summary.byFavoriteProbabilityBucket.map((segment, index) => ({
        evaluation_id: evaluationRow.id,
        segment_type: "favorite_probability_bucket",
        segment_key: segment.segment,
        sort_order: index,
        match_count: segment.matchCount,
        accuracy: segment.accuracy,
        log_loss: segment.logLoss,
        brier_score: segment.brierScore,
        average_confidence: segment.averageConfidence,
      })),
      ...summary.bySeason.map((segment, index) => ({
        evaluation_id: evaluationRow.id,
        segment_type: "season",
        segment_key: segment.segment,
        sort_order: index,
        match_count: segment.matchCount,
        accuracy: segment.accuracy,
        log_loss: segment.logLoss,
        brier_score: segment.brierScore,
        average_confidence: segment.averageConfidence,
      })),
    ];

    const comparisonRows = summary.comparisonOverview.map((row) => ({
      evaluation_id: evaluationRow.id,
      model_version: row.modelVersion,
      model_family: row.modelFamily,
      match_count: row.matchCount,
      accuracy: row.accuracy,
      log_loss: row.logLoss,
      brier_score: row.brierScore,
      calibration_error: row.calibrationError,
      average_confidence: row.averageConfidence,
      average_favorite_win_probability: row.averageFavoriteWinProbability,
      favorite_win_rate: row.favoriteWinRate,
    }));

    const segmentComparisonRows = [
      ...comparisonBySurface.flatMap((segment, segmentIndex) =>
        segment.rows.map((row) => ({
          evaluation_id: evaluationRow.id,
          segment_type: "surface",
          segment_key: segment.segment,
          sort_order: segmentIndex,
          model_version: row.modelVersion,
          model_family: row.modelFamily,
          match_count: row.matchCount,
          accuracy: row.accuracy,
          log_loss: row.logLoss,
          brier_score: row.brierScore,
          average_confidence: row.averageConfidence,
        })),
      ),
      ...comparisonByTournamentLevel.flatMap((segment, segmentIndex) =>
        segment.rows.map((row) => ({
          evaluation_id: evaluationRow.id,
          segment_type: "tournament_level",
          segment_key: segment.segment,
          sort_order: segmentIndex,
          model_version: row.modelVersion,
          model_family: row.modelFamily,
          match_count: row.matchCount,
          accuracy: row.accuracy,
          log_loss: row.logLoss,
          brier_score: row.brierScore,
          average_confidence: row.averageConfidence,
        })),
      ),
      ...comparisonByBestOf.flatMap((segment, segmentIndex) =>
        segment.rows.map((row) => ({
          evaluation_id: evaluationRow.id,
          segment_type: "best_of",
          segment_key: segment.segment,
          sort_order: segmentIndex,
          model_version: row.modelVersion,
          model_family: row.modelFamily,
          match_count: row.matchCount,
          accuracy: row.accuracy,
          log_loss: row.logLoss,
          brier_score: row.brierScore,
          average_confidence: row.averageConfidence,
        })),
      ),
    ];

    const ablationRows = summary.ablationOverview.map((row, index) => ({
      evaluation_id: evaluationRow.id,
      sort_order: index,
      omitted_factor: row.omittedFactor,
      omitted_label: row.omittedLabel,
      match_count: row.matchCount,
      accuracy: row.accuracy,
      log_loss: row.logLoss,
      brier_score: row.brierScore,
      calibration_error: row.calibrationError,
      average_confidence: row.averageConfidence,
      accuracy_delta_vs_primary: row.accuracyDeltaVsPrimary,
      log_loss_delta_vs_primary: row.logLossDeltaVsPrimary,
      brier_delta_vs_primary: row.brierDeltaVsPrimary,
      calibration_delta_vs_primary: row.calibrationDeltaVsPrimary,
    }));

    await insertBatches("model_evaluation_calibration_buckets", calibrationRows);
    await insertBatches("model_evaluation_segments", segmentRows);
    await insertBatches("model_evaluation_comparisons", comparisonRows);
    await insertBatches("model_evaluation_segment_comparisons", segmentComparisonRows);
    await insertBatches("model_evaluation_ablations", ablationRows);

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
          evaluationVersion,
          evaluationLoaded: summary.modelVersion,
          predictionsLoaded: rows.length,
          predictionFactorsLoaded: factorRows.length,
          calibrationBucketsLoaded: calibrationRows.length,
          segmentsLoaded: segmentRows.length,
          comparisonRowsLoaded: comparisonRows.length,
          segmentComparisonRowsLoaded: segmentComparisonRows.length,
          ablationRowsLoaded: ablationRows.length,
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
