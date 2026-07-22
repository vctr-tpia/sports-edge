import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PredictionFactor } from "@/src/domain/predictions/explanation";
import type { HistoricalMatchFeatureSnapshot } from "@/src/domain/predictions/feature-snapshot";
import type { Surface, TournamentLevel } from "@/src/domain/shared";
import { loadActiveHistoricalDataset } from "@/src/lib/active-history";
import { generatePredictionFromFeatureSnapshot } from "@/src/prediction/baseline-feature-model";
import { projectMatchTotals } from "@/src/prediction/match-projection";

const FEATURES_DIR = path.join(process.cwd(), "work", "features", "atp-match-features");
const OUTPUT_ROOT_DIR = path.join(process.cwd(), "work", "evaluation");
const CALIBRATION_BUCKET_SIZE = 0.05;

type HistoricalFeatureRow = {
  match_id: string;
  feature_version: string;
  match_date: string;
  tournament_id: string;
  tournament_level: TournamentLevel;
  surface: Surface;
  round: string;
  player_a_id: string;
  player_b_id: string;
  actual_winner_id: string;
  actual_loser_id: string;
  player_a_overall_elo: number;
  player_b_overall_elo: number;
  player_a_surface_elo: number;
  player_b_surface_elo: number;
  player_a_recent_form: number;
  player_b_recent_form: number;
  player_a_surface_recent_form?: number;
  player_b_surface_recent_form?: number;
  player_a_surface_service_points_won?: number;
  player_b_surface_service_points_won?: number;
  player_a_surface_return_points_won?: number;
  player_b_surface_return_points_won?: number;
  player_a_surface_win_rate: number;
  player_b_surface_win_rate: number;
  player_a_opponent_quality: number;
  player_b_opponent_quality: number;
  player_a_rest_days: number | null;
  player_b_rest_days: number | null;
  player_a_h2h_wins: number;
  player_b_h2h_wins: number;
  player_a_overall_elo_edge: number;
  player_a_surface_elo_edge: number;
  player_a_recent_form_edge: number;
  player_a_surface_recent_form_edge?: number;
  player_a_surface_service_points_won_edge?: number;
  player_a_surface_return_points_won_edge?: number;
  player_a_surface_win_rate_edge: number;
  player_a_opponent_quality_edge: number;
  player_a_rest_days_edge: number | null;
  player_a_h2h_edge: number;
};

type ModelFamily = "full_model" | "benchmark" | "ablation";

type RankingContext = {
  playerARankAtMatch: number | null;
  playerBRankAtMatch: number | null;
};

type BacktestPredictionRow = {
  match_id: string;
  model_version: string;
  model_family: ModelFamily;
  generated_at: string;
  match_date: string;
  season: string;
  tournament_id: string;
  tournament_level: TournamentLevel;
  surface: Surface;
  best_of: 3 | 5;
  player_a_id: string;
  player_b_id: string;
  player_a_rank_at_match: number | null;
  player_b_rank_at_match: number | null;
  ranking_gap_bucket: string;
  favorite_probability_bucket: string;
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
  explanation: PredictionFactor[];
};

type CalibrationBucket = {
  bucketLabel: string;
  probabilityFrom: number;
  probabilityTo: number;
  matchCount: number;
  averagePredictedWinProbability: number;
  actualFavoriteWinRate: number;
  averageConfidence: number;
};

type SegmentSummary = {
  segment: string;
  matchCount: number;
  accuracy: number;
  logLoss: number;
  brierScore: number;
  averageConfidence: number;
};

type ComparisonOverviewRow = {
  modelVersion: string;
  modelFamily: ModelFamily;
  matchCount: number;
  accuracy: number;
  logLoss: number;
  brierScore: number;
  calibrationError: number;
  averageConfidence: number;
  averageFavoriteWinProbability: number;
  favoriteWinRate: number;
};

type SegmentComparisonRow = SegmentSummary & {
  modelVersion: string;
  modelFamily: ModelFamily;
};

type SegmentComparison = {
  segment: string;
  rows: SegmentComparisonRow[];
};

type AblationSummaryRow = {
  omittedFactor: PredictionFactor["key"];
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

export type BacktestSummary = {
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
  calibrationBuckets: CalibrationBucket[];
  bySurface: SegmentSummary[];
  byTournamentLevel: SegmentSummary[];
  byBestOf: SegmentSummary[];
  byRankingGapBucket: SegmentSummary[];
  byFavoriteProbabilityBucket: SegmentSummary[];
  bySeason: SegmentSummary[];
  comparisonOverview: ComparisonOverviewRow[];
  comparisonBestByMetric: {
    accuracy: string;
    logLoss: string;
    brierScore: string;
    calibrationError: string;
  };
  ablationOverview: AblationSummaryRow[];
  notes: string[];
};

function roundMetric(value: number, digits = 4) {
  return Number.parseFloat(value.toFixed(digits));
}

async function readJsonLines<T>(filePath: string): Promise<T[]> {
  const content = await readFile(filePath, "utf8");
  return content
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

async function writeJsonLines<T>(filePath: string, rows: T[]) {
  const content = rows.map((row) => JSON.stringify(row)).join("\n");
  await writeFile(filePath, content.length > 0 ? `${content}\n` : "", "utf8");
}

function clampProbability(value: number) {
  return Math.min(0.99999, Math.max(0.00001, value));
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function inferBestOf(snapshot: HistoricalMatchFeatureSnapshot): 3 | 5 {
  return snapshot.tournamentLevel === "grand_slam" ? 5 : 3;
}

function favoriteProbabilityBucket(probability: number) {
  for (let start = 0.5; start < 1; start += CALIBRATION_BUCKET_SIZE) {
    const end = Math.min(1, start + CALIBRATION_BUCKET_SIZE);
    if (
      probability >= start &&
      (end === 1 ? probability <= end : probability < end)
    ) {
      return `${Math.round(start * 100)}-${Math.round(end * 100)}%`;
    }
  }

  return "50-55%";
}

function rankingGapBucket(rankA: number | null, rankB: number | null) {
  if (rankA === null || rankB === null) {
    return "unknown";
  }

  const gap = Math.abs(rankA - rankB);
  if (gap <= 10) {
    return "0-10";
  }
  if (gap <= 25) {
    return "11-25";
  }
  if (gap <= 50) {
    return "26-50";
  }
  if (gap <= 100) {
    return "51-100";
  }

  return "100+";
}

function toSeason(matchDate: string) {
  return matchDate.slice(0, 4);
}

function summarizeSegment(segment: string, rows: BacktestPredictionRow[]): SegmentSummary {
  return {
    segment,
    matchCount: rows.length,
    accuracy: roundMetric(average(rows.map((row) => row.favorite_won))),
    logLoss: roundMetric(average(rows.map((row) => row.log_loss))),
    brierScore: roundMetric(average(rows.map((row) => row.brier_score))),
    averageConfidence: roundMetric(average(rows.map((row) => row.confidence))),
  };
}

function buildCalibrationBuckets(rows: BacktestPredictionRow[]): CalibrationBucket[] {
  const buckets: CalibrationBucket[] = [];

  for (let start = 0.5; start < 1; start += CALIBRATION_BUCKET_SIZE) {
    const bucketEnd = Math.min(1, start + CALIBRATION_BUCKET_SIZE);
    const inBucket = rows.filter((row) =>
      row.favorite_win_probability >= start &&
      (bucketEnd === 1
        ? row.favorite_win_probability <= bucketEnd
        : row.favorite_win_probability < bucketEnd),
    );

    if (inBucket.length === 0) {
      continue;
    }

    buckets.push({
      bucketLabel: `${Math.round(start * 100)}-${Math.round(bucketEnd * 100)}%`,
      probabilityFrom: roundMetric(start, 2),
      probabilityTo: roundMetric(bucketEnd, 2),
      matchCount: inBucket.length,
      averagePredictedWinProbability: roundMetric(
        average(inBucket.map((row) => row.favorite_win_probability)),
      ),
      actualFavoriteWinRate: roundMetric(average(inBucket.map((row) => row.favorite_won))),
      averageConfidence: roundMetric(average(inBucket.map((row) => row.confidence))),
    });
  }

  return buckets;
}

function expectedCalibrationError(rows: BacktestPredictionRow[]) {
  if (rows.length === 0) {
    return 0;
  }

  const buckets = buildCalibrationBuckets(rows);
  const weightedError = buckets.reduce((sum, bucket) => {
    const bucketWeight = bucket.matchCount / rows.length;
    return sum + Math.abs(bucket.averagePredictedWinProbability - bucket.actualFavoriteWinRate) * bucketWeight;
  }, 0);

  return roundMetric(weightedError, 5);
}

function buildSegmentSummaries(
  rows: BacktestPredictionRow[],
  getSegment: (row: BacktestPredictionRow) => string,
  sortOrder?: string[],
) {
  const grouped = new Map<string, BacktestPredictionRow[]>();

  for (const row of rows) {
    const segment = getSegment(row);
    grouped.set(segment, [...(grouped.get(segment) ?? []), row]);
  }

  const summaries = [...grouped.entries()].map(([segment, segmentRows]) =>
    summarizeSegment(segment, segmentRows),
  );

  if (sortOrder) {
    const order = new Map(sortOrder.map((segment, index) => [segment, index]));
    summaries.sort((left, right) => {
      const leftIndex = order.get(left.segment) ?? Number.MAX_SAFE_INTEGER;
      const rightIndex = order.get(right.segment) ?? Number.MAX_SAFE_INTEGER;
      if (leftIndex !== rightIndex) {
        return leftIndex - rightIndex;
      }

      return left.segment.localeCompare(right.segment);
    });
    return summaries;
  }

  return summaries.sort((left, right) => left.segment.localeCompare(right.segment));
}

function buildSegmentComparison(
  rows: BacktestPredictionRow[],
  getSegment: (row: BacktestPredictionRow) => string,
  sortOrder?: string[],
): SegmentComparison[] {
  const bySegment = new Map<string, Map<string, BacktestPredictionRow[]>>();

  for (const row of rows) {
    const segment = getSegment(row);
    const rowsByModel = bySegment.get(segment) ?? new Map<string, BacktestPredictionRow[]>();
    rowsByModel.set(row.model_version, [...(rowsByModel.get(row.model_version) ?? []), row]);
    bySegment.set(segment, rowsByModel);
  }

  const comparisons = [...bySegment.entries()].map(([segment, rowsByModel]) => ({
    segment,
    rows: [...rowsByModel.entries()]
      .map(([modelVersion, modelRows]) => ({
        ...summarizeSegment(segment, modelRows),
        modelVersion,
        modelFamily: modelRows[0]?.model_family ?? "benchmark",
      }))
      .sort((left, right) => left.modelVersion.localeCompare(right.modelVersion)),
  }));

  if (sortOrder) {
    const order = new Map(sortOrder.map((segment, index) => [segment, index]));
    comparisons.sort((left, right) => {
      const leftIndex = order.get(left.segment) ?? Number.MAX_SAFE_INTEGER;
      const rightIndex = order.get(right.segment) ?? Number.MAX_SAFE_INTEGER;
      if (leftIndex !== rightIndex) {
        return leftIndex - rightIndex;
      }

      return left.segment.localeCompare(right.segment);
    });
    return comparisons;
  }

  return comparisons.sort((left, right) => left.segment.localeCompare(right.segment));
}

function mapHistoricalFeatureRow(row: HistoricalFeatureRow): HistoricalMatchFeatureSnapshot {
  return {
    matchId: row.match_id,
    featureVersion: row.feature_version,
    matchDate: row.match_date,
    tournamentId: row.tournament_id,
    tournamentLevel: row.tournament_level,
    surface: row.surface,
    round: row.round as HistoricalMatchFeatureSnapshot["round"],
    playerAId: row.player_a_id,
    playerBId: row.player_b_id,
    actualWinnerId: row.actual_winner_id,
    actualLoserId: row.actual_loser_id,
    playerAOverallElo: row.player_a_overall_elo,
    playerBOverallElo: row.player_b_overall_elo,
    playerASurfaceElo: row.player_a_surface_elo,
    playerBSurfaceElo: row.player_b_surface_elo,
    playerARecentForm: row.player_a_recent_form,
    playerBRecentForm: row.player_b_recent_form,
    playerASurfaceRecentForm: row.player_a_surface_recent_form,
    playerBSurfaceRecentForm: row.player_b_surface_recent_form,
    playerASurfaceServicePointsWon: row.player_a_surface_service_points_won,
    playerBSurfaceServicePointsWon: row.player_b_surface_service_points_won,
    playerASurfaceReturnPointsWon: row.player_a_surface_return_points_won,
    playerBSurfaceReturnPointsWon: row.player_b_surface_return_points_won,
    playerASurfaceWinRate: row.player_a_surface_win_rate,
    playerBSurfaceWinRate: row.player_b_surface_win_rate,
    playerAOpponentQuality: row.player_a_opponent_quality,
    playerBOpponentQuality: row.player_b_opponent_quality,
    playerARestDays: row.player_a_rest_days,
    playerBRestDays: row.player_b_rest_days,
    playerAH2HWins: row.player_a_h2h_wins,
    playerBH2HWins: row.player_b_h2h_wins,
    playerAOverallEloEdge: row.player_a_overall_elo_edge,
    playerASurfaceEloEdge: row.player_a_surface_elo_edge,
    playerARecentFormEdge: row.player_a_recent_form_edge,
    playerASurfaceRecentFormEdge: row.player_a_surface_recent_form_edge,
    playerASurfaceServicePointsWonEdge: row.player_a_surface_service_points_won_edge,
    playerASurfaceReturnPointsWonEdge: row.player_a_surface_return_points_won_edge,
    playerASurfaceWinRateEdge: row.player_a_surface_win_rate_edge,
    playerAOpponentQualityEdge: row.player_a_opponent_quality_edge,
    playerARestDaysEdge: row.player_a_rest_days_edge,
    playerAH2HEdge: row.player_a_h2h_edge,
  };
}

function eloProbability(playerARating: number, playerBRating: number) {
  return 1 / (1 + 10 ** ((playerBRating - playerARating) / 400));
}

function logisticProbability(edge: number, scale: number) {
  return 1 / (1 + Math.exp(-(edge / scale)));
}

function makeProjection(snapshot: HistoricalMatchFeatureSnapshot, playerAWinProbability: number, playerBWinProbability: number) {
  return projectMatchTotals({
    playerAWinProbability,
    playerBWinProbability,
    bestOf: inferBestOf(snapshot),
    averageSurfaceServicePointsWon:
      ((snapshot.playerASurfaceServicePointsWon ?? 62) + (snapshot.playerBSurfaceServicePointsWon ?? 62)) / 2,
  });
}

function toPredictionFactor(
  key: PredictionFactor["key"],
  label: string,
  playerAValue: number,
  playerBValue: number,
  weight = 1,
): PredictionFactor {
  return {
    key,
    label,
    weight,
    playerAValue,
    playerBValue,
    edgeToPlayerA: roundMetric(playerAValue - playerBValue, 5),
    summary: playerAValue >= playerBValue ? `${label} favors player A` : `${label} favors player B`,
  };
}

function createBenchmarkPredictionRow(
  snapshot: HistoricalMatchFeatureSnapshot,
  modelVersion: string,
  modelFamily: ModelFamily,
  playerAWinProbability: number,
  explanation: PredictionFactor[],
  rankingContext: RankingContext,
): BacktestPredictionRow {
  const probabilityPlayerA = clampProbability(playerAWinProbability);
  const probabilityPlayerB = clampProbability(1 - probabilityPlayerA);
  const favoritePlayerId =
    probabilityPlayerA >= probabilityPlayerB ? snapshot.playerAId : snapshot.playerBId;
  const playerAActualWin = snapshot.actualWinnerId === snapshot.playerAId ? 1 : 0;
  const favoriteWinProbability = Math.max(probabilityPlayerA, probabilityPlayerB);
  const favoriteWon = favoritePlayerId === snapshot.actualWinnerId ? 1 : 0;
  const logLoss = -(
    playerAActualWin * Math.log(probabilityPlayerA) +
    (1 - playerAActualWin) * Math.log(1 - probabilityPlayerA)
  );
  const brierScore = (probabilityPlayerA - playerAActualWin) ** 2;
  const bestOf = inferBestOf(snapshot);

  return {
    match_id: snapshot.matchId,
    model_version: modelVersion,
    model_family: modelFamily,
    generated_at: snapshot.matchDate,
    match_date: snapshot.matchDate,
    season: toSeason(snapshot.matchDate),
    tournament_id: snapshot.tournamentId,
    tournament_level: snapshot.tournamentLevel,
    surface: snapshot.surface,
    best_of: bestOf,
    player_a_id: snapshot.playerAId,
    player_b_id: snapshot.playerBId,
    player_a_rank_at_match: rankingContext.playerARankAtMatch,
    player_b_rank_at_match: rankingContext.playerBRankAtMatch,
    ranking_gap_bucket: rankingGapBucket(
      rankingContext.playerARankAtMatch,
      rankingContext.playerBRankAtMatch,
    ),
    favorite_probability_bucket: favoriteProbabilityBucket(favoriteWinProbability),
    favorite_player_id: favoritePlayerId,
    actual_winner_id: snapshot.actualWinnerId,
    actual_loser_id: snapshot.actualLoserId,
    player_a_win_probability: roundMetric(probabilityPlayerA, 5),
    player_b_win_probability: roundMetric(probabilityPlayerB, 5),
    confidence: roundMetric(Math.abs(probabilityPlayerA - 0.5) * 2, 5),
    result: favoriteWon === 1 ? "won" : "lost",
    player_a_actual_win: playerAActualWin,
    favorite_win_probability: roundMetric(favoriteWinProbability, 5),
    favorite_won: favoriteWon,
    log_loss: roundMetric(logLoss, 6),
    brier_score: roundMetric(brierScore, 6),
    explanation,
  };
}

function createRankingBaselinePrediction(
  snapshot: HistoricalMatchFeatureSnapshot,
  rankingContext: RankingContext,
) {
  let playerAWinProbability = 0.5;

  if (
    rankingContext.playerARankAtMatch !== null &&
    rankingContext.playerBRankAtMatch !== null
  ) {
    playerAWinProbability = logisticProbability(
      rankingContext.playerBRankAtMatch - rankingContext.playerARankAtMatch,
      12,
    );
  } else if (rankingContext.playerARankAtMatch !== null) {
    playerAWinProbability = 0.58;
  } else if (rankingContext.playerBRankAtMatch !== null) {
    playerAWinProbability = 0.42;
  }

  return createBenchmarkPredictionRow(
    snapshot,
    "ranking-baseline",
    "benchmark",
    playerAWinProbability,
    [
      toPredictionFactor(
        "recent_form",
        "ATP Rank At Match",
        rankingContext.playerBRankAtMatch === null ? 0 : -(rankingContext.playerARankAtMatch ?? 999),
        rankingContext.playerARankAtMatch === null ? 0 : -(rankingContext.playerBRankAtMatch ?? 999),
      ),
    ],
    rankingContext,
  );
}

function createOverallEloBaselinePrediction(
  snapshot: HistoricalMatchFeatureSnapshot,
  rankingContext: RankingContext,
) {
  return createBenchmarkPredictionRow(
    snapshot,
    "overall-elo-baseline",
    "benchmark",
    eloProbability(snapshot.playerAOverallElo, snapshot.playerBOverallElo),
    [
      toPredictionFactor(
        "overall_elo",
        "Overall Elo Only",
        snapshot.playerAOverallElo,
        snapshot.playerBOverallElo,
      ),
    ],
    rankingContext,
  );
}

function createSurfaceEloBaselinePrediction(
  snapshot: HistoricalMatchFeatureSnapshot,
  rankingContext: RankingContext,
) {
  return createBenchmarkPredictionRow(
    snapshot,
    "surface-elo-baseline",
    "benchmark",
    eloProbability(snapshot.playerASurfaceElo, snapshot.playerBSurfaceElo),
    [
      toPredictionFactor(
        "surface_elo",
        `${snapshot.surface[0].toUpperCase()}${snapshot.surface.slice(1)} Elo Only`,
        snapshot.playerASurfaceElo,
        snapshot.playerBSurfaceElo,
      ),
    ],
    rankingContext,
  );
}

function createBlendedEloBaselinePrediction(
  snapshot: HistoricalMatchFeatureSnapshot,
  rankingContext: RankingContext,
) {
  const playerABlended = snapshot.playerAOverallElo * 0.35 + snapshot.playerASurfaceElo * 0.65;
  const playerBBlended = snapshot.playerBOverallElo * 0.35 + snapshot.playerBSurfaceElo * 0.65;

  return createBenchmarkPredictionRow(
    snapshot,
    "blended-elo-baseline",
    "benchmark",
    eloProbability(playerABlended, playerBBlended),
    [
      toPredictionFactor(
        "surface_elo",
        "Blended Elo (35% Overall / 65% Surface)",
        roundMetric(playerABlended, 2),
        roundMetric(playerBBlended, 2),
      ),
    ],
    rankingContext,
  );
}

function createFullModelPredictionRow(
  snapshot: HistoricalMatchFeatureSnapshot,
  featureVersion: HistoricalMatchFeatureSnapshot["featureVersion"],
  rankingContext: RankingContext,
) {
  const variantSnapshot = {
    ...snapshot,
    featureVersion,
  };
  const prediction = generatePredictionFromFeatureSnapshot(variantSnapshot);

  return createBenchmarkPredictionRow(
    snapshot,
    prediction.modelVersion,
    "full_model",
    prediction.playerAWinProbability,
    prediction.explanation,
    rankingContext,
  );
}

function comparisonBestByMetric(rows: ComparisonOverviewRow[]) {
  const accuracyLeader = [...rows].sort((left, right) => right.accuracy - left.accuracy)[0];
  const logLossLeader = [...rows].sort((left, right) => left.logLoss - right.logLoss)[0];
  const brierLeader = [...rows].sort((left, right) => left.brierScore - right.brierScore)[0];
  const calibrationLeader = [...rows].sort(
    (left, right) => left.calibrationError - right.calibrationError,
  )[0];

  return {
    accuracy: accuracyLeader?.modelVersion ?? "n/a",
    logLoss: logLossLeader?.modelVersion ?? "n/a",
    brierScore: brierLeader?.modelVersion ?? "n/a",
    calibrationError: calibrationLeader?.modelVersion ?? "n/a",
  };
}

function probabilityFromScore(score: number) {
  return 1 / (1 + Math.exp(-score));
}

function ablationLabelForFactor(key: PredictionFactor["key"]) {
  switch (key) {
    case "overall_elo":
      return "Overall Elo";
    case "surface_elo":
      return "Surface Elo";
    case "recent_form":
      return "Recent Form";
    case "surface_recent_form":
      return "Surface Recent Form";
    case "surface_service_points_won":
      return "Surface Service Strength";
    case "surface_return_points_won":
      return "Surface Return Strength";
    case "opponent_quality":
      return "Opponent Quality";
    case "surface_win_rate":
      return "Surface Win Rate";
    case "rest_days":
      return "Rest Days";
    case "head_to_head":
      return "Head-to-Head";
  }
}

function buildAblationOverview(
  primaryRows: BacktestPredictionRow[],
  primarySnapshots: HistoricalMatchFeatureSnapshot[],
) {
  const primaryByMatchId = new Map(primaryRows.map((row) => [row.match_id, row]));
  const factorLabels = new Map<PredictionFactor["key"], string>();

  for (const snapshot of primarySnapshots) {
    const prediction = generatePredictionFromFeatureSnapshot(snapshot);
    for (const factor of prediction.explanation) {
      if (!factorLabels.has(factor.key)) {
        factorLabels.set(factor.key, factor.label);
      }
    }
  }

  const primaryAccuracy = average(primaryRows.map((row) => row.favorite_won));
  const primaryLogLoss = average(primaryRows.map((row) => row.log_loss));
  const primaryBrier = average(primaryRows.map((row) => row.brier_score));
  const primaryCalibration = expectedCalibrationError(primaryRows);

  return [...factorLabels.keys()]
    .map((factorKey) => {
      const ablatedRows = primarySnapshots.map((snapshot) => {
        const prediction = generatePredictionFromFeatureSnapshot(snapshot);
        const ablatedExplanation = prediction.explanation.filter((factor) => factor.key !== factorKey);
        const ablatedScore = ablatedExplanation.reduce((sum, factor) => sum + factor.edgeToPlayerA, 0);
        const playerAWinProbability = clampProbability(probabilityFromScore(ablatedScore));

        return createBenchmarkPredictionRow(
          snapshot,
          `ablation-without-${factorKey}`,
          "ablation",
          playerAWinProbability,
          ablatedExplanation,
          {
            playerARankAtMatch:
              primaryByMatchId.get(snapshot.matchId)?.player_a_rank_at_match ?? null,
            playerBRankAtMatch:
              primaryByMatchId.get(snapshot.matchId)?.player_b_rank_at_match ?? null,
          },
        );
      });

      const accuracy = roundMetric(average(ablatedRows.map((row) => row.favorite_won)));
      const logLoss = roundMetric(average(ablatedRows.map((row) => row.log_loss)));
      const brierScore = roundMetric(average(ablatedRows.map((row) => row.brier_score)));
      const calibrationError = expectedCalibrationError(ablatedRows);
      const averageConfidence = roundMetric(average(ablatedRows.map((row) => row.confidence)));

      return {
        omittedFactor: factorKey,
        omittedLabel: ablationLabelForFactor(factorKey),
        matchCount: ablatedRows.length,
        accuracy,
        logLoss,
        brierScore,
        calibrationError,
        averageConfidence,
        accuracyDeltaVsPrimary: roundMetric(accuracy - primaryAccuracy, 5),
        logLossDeltaVsPrimary: roundMetric(logLoss - primaryLogLoss, 5),
        brierDeltaVsPrimary: roundMetric(brierScore - primaryBrier, 5),
        calibrationDeltaVsPrimary: roundMetric(calibrationError - primaryCalibration, 5),
      } satisfies AblationSummaryRow;
    })
    .sort((left, right) => {
      if (left.logLossDeltaVsPrimary !== right.logLossDeltaVsPrimary) {
        return right.logLossDeltaVsPrimary - left.logLossDeltaVsPrimary;
      }

      return right.accuracyDeltaVsPrimary - left.accuracyDeltaVsPrimary;
    });
}

function buildComparisonOverview(rowsByModel: Map<string, BacktestPredictionRow[]>) {
  return [...rowsByModel.entries()]
    .map(([modelVersion, rows]) => ({
      modelVersion,
      modelFamily: rows[0]?.model_family ?? "benchmark",
      matchCount: rows.length,
      accuracy: roundMetric(average(rows.map((row) => row.favorite_won))),
      logLoss: roundMetric(average(rows.map((row) => row.log_loss))),
      brierScore: roundMetric(average(rows.map((row) => row.brier_score))),
      calibrationError: expectedCalibrationError(rows),
      averageConfidence: roundMetric(average(rows.map((row) => row.confidence))),
      averageFavoriteWinProbability: roundMetric(
        average(rows.map((row) => row.favorite_win_probability)),
      ),
      favoriteWinRate: roundMetric(average(rows.map((row) => row.favorite_won))),
    }))
    .sort((left, right) => {
      if (left.modelFamily !== right.modelFamily) {
        return left.modelFamily.localeCompare(right.modelFamily);
      }
      return left.modelVersion.localeCompare(right.modelVersion);
    });
}

function buildMarkdownReport(
  summary: BacktestSummary,
  primaryRows: BacktestPredictionRow[],
) {
  const topComparisons = summary.comparisonOverview
    .map(
      (row) =>
        `| ${row.modelVersion} | ${row.modelFamily} | ${row.accuracy} | ${row.logLoss} | ${row.brierScore} | ${row.calibrationError} | ${row.matchCount} |`,
    )
    .join("\n");

  const surfaceRows = summary.bySurface
    .map(
      (row) =>
        `| ${row.segment} | ${row.matchCount} | ${row.accuracy} | ${row.logLoss} | ${row.brierScore} |`,
    )
    .join("\n");

  const ablationRows = summary.ablationOverview
    .map(
      (row) =>
        `| ${row.omittedLabel} | ${row.accuracy} | ${row.logLoss} | ${row.brierScore} | ${row.calibrationError} | ${row.accuracyDeltaVsPrimary} | ${row.logLossDeltaVsPrimary} |`,
    )
    .join("\n");

  return `# Sports Edge Model Evaluation\n
Generated: ${summary.generatedAt}
Primary model: ${summary.modelVersion}
Sample: ${primaryRows.length} ATP matches from ${summary.dateRange.from ?? "unknown"} to ${summary.dateRange.to ?? "unknown"}

## Comparison Overview

| Model | Family | Accuracy | Log Loss | Brier | Calibration Error | Matches |
| --- | --- | --- | --- | --- | --- | --- |
${topComparisons}

Best by accuracy: ${summary.comparisonBestByMetric.accuracy}
Best by log loss: ${summary.comparisonBestByMetric.logLoss}
Best by Brier: ${summary.comparisonBestByMetric.brierScore}
Best by calibration error: ${summary.comparisonBestByMetric.calibrationError}

## Primary Model Surface Split

| Surface | Matches | Accuracy | Log Loss | Brier |
| --- | --- | --- | --- | --- |
${surfaceRows}

## Primary Model Ablation

| Omitted Factor | Accuracy | Log Loss | Brier | Calibration Error | Accuracy Delta | Log Loss Delta |
| --- | --- | --- | --- | --- | --- | --- |
${ablationRows}

## Notes

${summary.notes.map((note) => `- ${note}`).join("\n")}
`;
}

export async function computeBaselineBacktest() {
  const [snapshots, historicalDataset] = await Promise.all([
    readJsonLines<HistoricalFeatureRow>(path.join(FEATURES_DIR, "historical_match_features.jsonl")),
    loadActiveHistoricalDataset(),
  ]);

  const sortedSnapshots = snapshots
    .map(mapHistoricalFeatureRow)
    .sort((left, right) => {
      const byDate = left.matchDate.localeCompare(right.matchDate);
      if (byDate !== 0) {
        return byDate;
      }

      return left.matchId.localeCompare(right.matchId);
    });

  const rankingByMatchPlayer = new Map(
    historicalDataset.matchEntries.map((entry) => [
      `${entry.match_id}:${entry.player_id}`,
      entry.ranking_at_match,
    ]),
  );

  const rowsByModel = new Map<string, BacktestPredictionRow[]>();
  const featureVersions: HistoricalMatchFeatureSnapshot["featureVersion"][] = [
    "baseline-features-v1",
    "baseline-features-v2",
    "baseline-features-v3",
    "baseline-features-v4",
    "baseline-features-v5",
  ];

  for (const snapshot of sortedSnapshots) {
    const rankingContext: RankingContext = {
      playerARankAtMatch:
        rankingByMatchPlayer.get(`${snapshot.matchId}:${snapshot.playerAId}`) ?? null,
      playerBRankAtMatch:
        rankingByMatchPlayer.get(`${snapshot.matchId}:${snapshot.playerBId}`) ?? null,
    };

    for (const featureVersion of featureVersions) {
      const row = createFullModelPredictionRow(snapshot, featureVersion, rankingContext);
      rowsByModel.set(row.model_version, [...(rowsByModel.get(row.model_version) ?? []), row]);
    }

    for (const row of [
      createRankingBaselinePrediction(snapshot, rankingContext),
      createOverallEloBaselinePrediction(snapshot, rankingContext),
      createSurfaceEloBaselinePrediction(snapshot, rankingContext),
      createBlendedEloBaselinePrediction(snapshot, rankingContext),
    ]) {
      rowsByModel.set(row.model_version, [...(rowsByModel.get(row.model_version) ?? []), row]);
    }
  }

  const primaryModelVersion = createFullModelPredictionRow(
    sortedSnapshots[0],
    "baseline-features-v5",
    {
      playerARankAtMatch:
        rankingByMatchPlayer.get(`${sortedSnapshots[0]?.matchId}:${sortedSnapshots[0]?.playerAId}`) ??
        null,
      playerBRankAtMatch:
        rankingByMatchPlayer.get(`${sortedSnapshots[0]?.matchId}:${sortedSnapshots[0]?.playerBId}`) ??
        null,
    },
  ).model_version;
  const primaryRows = rowsByModel.get(primaryModelVersion) ?? [];
  const outputDir = path.join(OUTPUT_ROOT_DIR, primaryModelVersion);
  const allRows = [...rowsByModel.values()].flat();

  await mkdir(outputDir, { recursive: true });
  for (const fileName of [
    "historical_predictions.jsonl",
    "comparison_predictions.jsonl",
    "summary.json",
    "calibration.json",
    "by_surface.json",
    "by_tournament_level.json",
    "by_best_of.json",
    "by_ranking_gap_bucket.json",
    "by_favorite_probability_bucket.json",
    "by_season.json",
    "comparison_overview.json",
    "comparison_by_surface.json",
    "comparison_by_tournament_level.json",
    "comparison_by_best_of.json",
    "ablation_overview.json",
    "report.md",
  ]) {
    await rm(path.join(outputDir, fileName), { force: true });
  }

  const bySurface = buildSegmentSummaries(primaryRows, (row) => row.surface, [
    "clay",
    "grass",
    "hard",
  ]);
  const byTournamentLevel = buildSegmentSummaries(primaryRows, (row) => row.tournament_level, [
    "grand_slam",
    "masters",
    "atp_500",
    "atp_250",
    "finals",
    "team_event",
    "olympics",
    "challenger",
    "tour",
  ]);
  const byBestOf = buildSegmentSummaries(primaryRows, (row) => `best_of_${row.best_of}`, [
    "best_of_3",
    "best_of_5",
  ]);
  const byRankingGapBucket = buildSegmentSummaries(primaryRows, (row) => row.ranking_gap_bucket, [
    "0-10",
    "11-25",
    "26-50",
    "51-100",
    "100+",
    "unknown",
  ]);
  const byFavoriteProbabilityBucket = buildSegmentSummaries(
    primaryRows,
    (row) => row.favorite_probability_bucket,
  );
  const bySeason = buildSegmentSummaries(primaryRows, (row) => row.season);
  const comparisonOverview = buildComparisonOverview(rowsByModel);
  const primarySnapshots = sortedSnapshots.map((snapshot) => ({
    ...snapshot,
    featureVersion: "baseline-features-v5" as const,
  }));
  const ablationOverview = buildAblationOverview(primaryRows, primarySnapshots);

  const summary: BacktestSummary = {
    modelVersion: primaryModelVersion,
    generatedAt: new Date().toISOString(),
    matchCount: primaryRows.length,
    dateRange: {
      from: primaryRows[0]?.match_date ?? null,
      to: primaryRows.at(-1)?.match_date ?? null,
    },
    overall: {
      accuracy: roundMetric(average(primaryRows.map((row) => row.favorite_won))),
      logLoss: roundMetric(average(primaryRows.map((row) => row.log_loss))),
      brierScore: roundMetric(average(primaryRows.map((row) => row.brier_score))),
      calibrationError: expectedCalibrationError(primaryRows),
      averageConfidence: roundMetric(average(primaryRows.map((row) => row.confidence))),
      averageFavoriteWinProbability: roundMetric(
        average(primaryRows.map((row) => row.favorite_win_probability)),
      ),
      favoriteWinRate: roundMetric(average(primaryRows.map((row) => row.favorite_won))),
    },
    calibrationBuckets: buildCalibrationBuckets(primaryRows),
    bySurface,
    byTournamentLevel,
    byBestOf,
    byRankingGapBucket,
    byFavoriteProbabilityBucket,
    bySeason,
    comparisonOverview,
    comparisonBestByMetric: comparisonBestByMetric(comparisonOverview),
    ablationOverview,
    notes: [
      "Benchmark comparisons now score the full model and simpler alternatives on the exact same historical ATP matches.",
      "Ranking baseline probabilities use a naive logistic transform of rank gap and should be treated as a benchmark, not a production probability model.",
      "Historical evaluation currently covers main-draw ATP matches only, so qualifying-vs-main-draw splits are not yet available.",
      "Market-favorite benchmarking is still pending an odds source.",
      "Projected sets/games validation is not included in this report yet and should be evaluated separately before being trusted in-product.",
      "Ablation rows measure how baseline-v5 changes when a single scoring factor is removed across the same historical ATP sample.",
    ],
  };

  const comparisonBySurface = buildSegmentComparison(allRows, (row) => row.surface, [
    "clay",
    "grass",
    "hard",
  ]);
  const comparisonByTournamentLevel = buildSegmentComparison(
    allRows,
    (row) => row.tournament_level,
    ["grand_slam", "masters", "atp_500", "atp_250", "finals", "team_event", "olympics", "challenger", "tour"],
  );
  const comparisonByBestOf = buildSegmentComparison(allRows, (row) => `best_of_${row.best_of}`, [
    "best_of_3",
    "best_of_5",
  ]);

  await Promise.all([
    writeJsonLines(path.join(outputDir, "historical_predictions.jsonl"), primaryRows),
    writeJsonLines(path.join(outputDir, "comparison_predictions.jsonl"), allRows),
    writeFile(path.join(outputDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8"),
    writeFile(
      path.join(outputDir, "calibration.json"),
      `${JSON.stringify(summary.calibrationBuckets, null, 2)}\n`,
      "utf8",
    ),
    writeFile(path.join(outputDir, "by_surface.json"), `${JSON.stringify(bySurface, null, 2)}\n`, "utf8"),
    writeFile(
      path.join(outputDir, "by_tournament_level.json"),
      `${JSON.stringify(byTournamentLevel, null, 2)}\n`,
      "utf8",
    ),
    writeFile(path.join(outputDir, "by_best_of.json"), `${JSON.stringify(byBestOf, null, 2)}\n`, "utf8"),
    writeFile(
      path.join(outputDir, "by_ranking_gap_bucket.json"),
      `${JSON.stringify(byRankingGapBucket, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      path.join(outputDir, "by_favorite_probability_bucket.json"),
      `${JSON.stringify(byFavoriteProbabilityBucket, null, 2)}\n`,
      "utf8",
    ),
    writeFile(path.join(outputDir, "by_season.json"), `${JSON.stringify(bySeason, null, 2)}\n`, "utf8"),
    writeFile(
      path.join(outputDir, "comparison_overview.json"),
      `${JSON.stringify(comparisonOverview, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      path.join(outputDir, "comparison_by_surface.json"),
      `${JSON.stringify(comparisonBySurface, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      path.join(outputDir, "comparison_by_tournament_level.json"),
      `${JSON.stringify(comparisonByTournamentLevel, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      path.join(outputDir, "comparison_by_best_of.json"),
      `${JSON.stringify(comparisonByBestOf, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      path.join(outputDir, "ablation_overview.json"),
      `${JSON.stringify(ablationOverview, null, 2)}\n`,
      "utf8",
    ),
    writeFile(path.join(outputDir, "report.md"), `${buildMarkdownReport(summary, primaryRows)}\n`, "utf8"),
  ]);

  return summary;
}
