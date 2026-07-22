import { getSupabaseReadClient } from "@/src/lib/supabase";

export type ModelFamily = "full_model" | "benchmark" | "ablation";
export type EvaluationSegmentType =
  | "surface"
  | "tournament_level"
  | "best_of"
  | "ranking_gap_bucket"
  | "favorite_probability_bucket"
  | "season";
export type SegmentComparisonType = "surface" | "tournament_level" | "best_of";

type EvaluationRow = {
  id: string;
  evaluation_version: string;
  primary_model_version: string;
  generated_at: string;
  sample_match_count: number;
  sample_date_from: string | null;
  sample_date_to: string | null;
  overall_accuracy: number;
  overall_log_loss: number;
  overall_brier_score: number;
  overall_calibration_error: number;
  overall_average_confidence: number;
  overall_average_favorite_win_probability: number;
  overall_favorite_win_rate: number;
  best_accuracy_model_version: string | null;
  best_log_loss_model_version: string | null;
  best_brier_model_version: string | null;
  best_calibration_model_version: string | null;
  notes: string[] | null;
};

type CalibrationBucketRow = {
  bucket_label: string;
  probability_from: number;
  probability_to: number;
  match_count: number;
  average_predicted_win_probability: number;
  actual_favorite_win_rate: number;
  average_confidence: number;
  sort_order: number;
};

type SegmentRow = {
  segment_type: EvaluationSegmentType;
  segment_key: string;
  match_count: number;
  accuracy: number;
  log_loss: number;
  brier_score: number;
  average_confidence: number;
  sort_order: number;
};

type ComparisonRow = {
  model_version: string;
  model_family: ModelFamily;
  match_count: number;
  accuracy: number;
  log_loss: number;
  brier_score: number;
  calibration_error: number;
  average_confidence: number;
  average_favorite_win_probability: number;
  favorite_win_rate: number;
};

type SegmentComparisonRow = {
  segment_type: SegmentComparisonType;
  segment_key: string;
  model_version: string;
  model_family: ModelFamily;
  match_count: number;
  accuracy: number;
  log_loss: number;
  brier_score: number;
  average_confidence: number;
  sort_order: number;
};

type AblationRow = {
  omitted_factor: string;
  omitted_label: string;
  match_count: number;
  accuracy: number;
  log_loss: number;
  brier_score: number;
  calibration_error: number;
  average_confidence: number;
  accuracy_delta_vs_primary: number;
  log_loss_delta_vs_primary: number;
  brier_delta_vs_primary: number;
  calibration_delta_vs_primary: number;
  sort_order: number;
};

export type ModelHealthEvaluation = {
  evaluation: EvaluationRow;
  calibrationBuckets: CalibrationBucketRow[];
  comparisons: ComparisonRow[];
  segments: Record<EvaluationSegmentType, SegmentRow[]>;
  segmentComparisons: Record<
    SegmentComparisonType,
    Array<{
      segment: string;
      rows: SegmentComparisonRow[];
    }>
  >;
  ablations: AblationRow[];
  insights: {
    strongestSurface: SegmentRow | null;
    weakestSurface: SegmentRow | null;
    bestTournamentLevel: SegmentRow | null;
    mostImportantFactor: AblationRow | null;
    worstCalibratedBucket: CalibrationBucketRow | null;
  };
};

function compareModels(left: ComparisonRow | SegmentComparisonRow, right: ComparisonRow | SegmentComparisonRow) {
  if (left.model_family !== right.model_family) {
    if (left.model_family === "full_model") {
      return -1;
    }
    if (right.model_family === "full_model") {
      return 1;
    }
  }

  return left.log_loss - right.log_loss;
}

function groupSegments<T extends { segment_type: string }>(
  rows: T[],
  keys: readonly string[],
) {
  return keys.reduce<Record<string, T[]>>((accumulator, key) => {
    accumulator[key] = rows.filter((row) => row.segment_type === key);
    return accumulator;
  }, {});
}

export async function getLatestModelHealthEvaluation(): Promise<ModelHealthEvaluation | null> {
  let client;

  try {
    client = getSupabaseReadClient();
  } catch {
    return null;
  }

  const { data: evaluation, error: evaluationError } = await client
    .from("model_evaluations")
    .select(
      `
        id,
        evaluation_version,
        primary_model_version,
        generated_at,
        sample_match_count,
        sample_date_from,
        sample_date_to,
        overall_accuracy,
        overall_log_loss,
        overall_brier_score,
        overall_calibration_error,
        overall_average_confidence,
        overall_average_favorite_win_probability,
        overall_favorite_win_rate,
        best_accuracy_model_version,
        best_log_loss_model_version,
        best_brier_model_version,
        best_calibration_model_version,
        notes
      `,
    )
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle<EvaluationRow>();

  if (evaluationError) {
    throw new Error(`Failed to load model evaluation: ${evaluationError.message}`);
  }

  if (!evaluation) {
    return null;
  }

  const [
    calibrationResult,
    comparisonsResult,
    segmentsResult,
    segmentComparisonsResult,
    ablationsResult,
  ] = await Promise.all([
    client
      .from("model_evaluation_calibration_buckets")
      .select(
        `
          bucket_label,
          probability_from,
          probability_to,
          match_count,
          average_predicted_win_probability,
          actual_favorite_win_rate,
          average_confidence,
          sort_order
        `,
      )
      .eq("evaluation_id", evaluation.id)
      .order("sort_order", { ascending: true }),
    client
      .from("model_evaluation_comparisons")
      .select(
        `
          model_version,
          model_family,
          match_count,
          accuracy,
          log_loss,
          brier_score,
          calibration_error,
          average_confidence,
          average_favorite_win_probability,
          favorite_win_rate
        `,
      )
      .eq("evaluation_id", evaluation.id),
    client
      .from("model_evaluation_segments")
      .select(
        `
          segment_type,
          segment_key,
          match_count,
          accuracy,
          log_loss,
          brier_score,
          average_confidence,
          sort_order
        `,
      )
      .eq("evaluation_id", evaluation.id)
      .order("sort_order", { ascending: true }),
    client
      .from("model_evaluation_segment_comparisons")
      .select(
        `
          segment_type,
          segment_key,
          model_version,
          model_family,
          match_count,
          accuracy,
          log_loss,
          brier_score,
          average_confidence,
          sort_order
        `,
      )
      .eq("evaluation_id", evaluation.id)
      .order("sort_order", { ascending: true }),
    client
      .from("model_evaluation_ablations")
      .select(
        `
          omitted_factor,
          omitted_label,
          match_count,
          accuracy,
          log_loss,
          brier_score,
          calibration_error,
          average_confidence,
          accuracy_delta_vs_primary,
          log_loss_delta_vs_primary,
          brier_delta_vs_primary,
          calibration_delta_vs_primary,
          sort_order
        `,
      )
      .eq("evaluation_id", evaluation.id)
      .order("sort_order", { ascending: true }),
  ]);

  const queryResults = [
    calibrationResult,
    comparisonsResult,
    segmentsResult,
    segmentComparisonsResult,
    ablationsResult,
  ];

  for (const result of queryResults) {
    if (result.error) {
      throw new Error(`Failed to load model-health data: ${result.error.message}`);
    }
  }

  const calibrationBuckets = (calibrationResult.data ?? []) as CalibrationBucketRow[];
  const comparisons = ((comparisonsResult.data ?? []) as ComparisonRow[]).sort(compareModels);
  const segmentRows = (segmentsResult.data ?? []) as SegmentRow[];
  const segmentComparisonRows = (segmentComparisonsResult.data ?? []) as SegmentComparisonRow[];
  const ablations = (ablationsResult.data ?? []) as AblationRow[];

  const segmentTypes = [
    "surface",
    "tournament_level",
    "best_of",
    "ranking_gap_bucket",
    "favorite_probability_bucket",
    "season",
  ] as const;
  const groupedSegments = groupSegments(segmentRows, segmentTypes) as Record<
    EvaluationSegmentType,
    SegmentRow[]
  >;

  const comparisonTypes = ["surface", "tournament_level", "best_of"] as const;
  const groupedSegmentComparisons = comparisonTypes.reduce<
    Record<SegmentComparisonType, Array<{ segment: string; rows: SegmentComparisonRow[] }>>
  >((accumulator, segmentType) => {
    const rowsForType = segmentComparisonRows.filter((row) => row.segment_type === segmentType);
    const segments = [...new Set(rowsForType.map((row) => row.segment_key))];

    accumulator[segmentType] = segments.map((segment) => ({
      segment,
      rows: rowsForType.filter((row) => row.segment_key === segment).sort(compareModels),
    }));

    return accumulator;
  }, {} as Record<SegmentComparisonType, Array<{ segment: string; rows: SegmentComparisonRow[] }>>);

  const strongestSurface =
    [...groupedSegments.surface].sort((left, right) => right.accuracy - left.accuracy)[0] ?? null;
  const weakestSurface =
    [...groupedSegments.surface].sort((left, right) => left.accuracy - right.accuracy)[0] ?? null;
  const bestTournamentLevel =
    [...groupedSegments.tournament_level].sort((left, right) => right.accuracy - left.accuracy)[0] ??
    null;
  const mostImportantFactor =
    [...ablations].sort((left, right) => left.accuracy_delta_vs_primary - right.accuracy_delta_vs_primary)[0] ??
    null;
  const worstCalibratedBucket =
    [...calibrationBuckets].sort((left, right) => {
      const leftGap = Math.abs(
        left.average_predicted_win_probability - left.actual_favorite_win_rate,
      );
      const rightGap = Math.abs(
        right.average_predicted_win_probability - right.actual_favorite_win_rate,
      );
      return rightGap - leftGap;
    })[0] ?? null;

  return {
    evaluation,
    calibrationBuckets,
    comparisons,
    segments: groupedSegments,
    segmentComparisons: groupedSegmentComparisons,
    ablations,
    insights: {
      strongestSurface,
      weakestSurface,
      bestTournamentLevel,
      mostImportantFactor,
      worstCalibratedBucket,
    },
  };
}
