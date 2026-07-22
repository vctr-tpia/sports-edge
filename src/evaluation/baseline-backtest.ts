import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { MatchPrediction, PredictionFactor } from "@/src/domain/predictions/explanation";
import type {
  HistoricalMatchFeatureSnapshot,
} from "@/src/domain/predictions/feature-snapshot";
import type { Surface, TournamentLevel } from "@/src/domain/shared";
import { generatePredictionFromFeatureSnapshot } from "@/src/prediction/baseline-feature-model";

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

export type BacktestPredictionRow = {
  match_id: string;
  model_version: string;
  generated_at: string;
  match_date: string;
  tournament_id: string;
  tournament_level: TournamentLevel;
  surface: Surface;
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
    averageConfidence: number;
    averageFavoriteWinProbability: number;
    favoriteWinRate: number;
  };
  calibrationBuckets: CalibrationBucket[];
  bySurface: SegmentSummary[];
  byTournamentLevel: SegmentSummary[];
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

  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
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

function toHistoricalPredictionRow(
  snapshot: HistoricalMatchFeatureSnapshot,
  prediction: MatchPrediction,
): BacktestPredictionRow {
  const playerAActualWin = snapshot.actualWinnerId === snapshot.playerAId ? 1 : 0;
  const probabilityPlayerA = clampProbability(prediction.playerAWinProbability);
  const favoriteWinProbability = Math.max(
    prediction.playerAWinProbability,
    prediction.playerBWinProbability,
  );
  const favoriteWon = prediction.favoritePlayerId === snapshot.actualWinnerId ? 1 : 0;
  const logLoss = -(
    playerAActualWin * Math.log(probabilityPlayerA) +
    (1 - playerAActualWin) * Math.log(1 - probabilityPlayerA)
  );
  const brierScore = (probabilityPlayerA - playerAActualWin) ** 2;

  return {
    match_id: snapshot.matchId,
    model_version: prediction.modelVersion,
    generated_at: snapshot.matchDate,
    match_date: snapshot.matchDate,
    tournament_id: snapshot.tournamentId,
    tournament_level: snapshot.tournamentLevel,
    surface: snapshot.surface,
    player_a_id: snapshot.playerAId,
    player_b_id: snapshot.playerBId,
    favorite_player_id: prediction.favoritePlayerId,
    actual_winner_id: snapshot.actualWinnerId,
    actual_loser_id: snapshot.actualLoserId,
    player_a_win_probability: roundMetric(prediction.playerAWinProbability, 5),
    player_b_win_probability: roundMetric(prediction.playerBWinProbability, 5),
    confidence: roundMetric(prediction.confidence, 5),
    result: favoriteWon === 1 ? "won" : "lost",
    player_a_actual_win: playerAActualWin,
    favorite_win_probability: roundMetric(favoriteWinProbability, 5),
    favorite_won: favoriteWon,
    log_loss: roundMetric(logLoss, 6),
    brier_score: roundMetric(brierScore, 6),
    explanation: prediction.explanation,
  };
}

export async function computeBaselineBacktest() {
  const snapshots = (
    await readJsonLines<HistoricalFeatureRow>(
      path.join(FEATURES_DIR, "historical_match_features.jsonl"),
    )
  ).map(mapHistoricalFeatureRow);

  const predictionRows = snapshots.map((snapshot) =>
    toHistoricalPredictionRow(snapshot, generatePredictionFromFeatureSnapshot(snapshot)),
  );
  const modelVersion = predictionRows[0]?.model_version ?? "baseline";
  const outputDir = path.join(OUTPUT_ROOT_DIR, modelVersion);

  await mkdir(outputDir, { recursive: true });
  for (const fileName of [
    "historical_predictions.jsonl",
    "summary.json",
    "calibration.json",
    "by_surface.json",
    "by_tournament_level.json",
  ]) {
    await rm(path.join(outputDir, fileName), { force: true });
  }

  const bySurface = Array.from(new Set(predictionRows.map((row) => row.surface)))
    .sort()
    .map((surface) => summarizeSegment(surface, predictionRows.filter((row) => row.surface === surface)));

  const byTournamentLevel = Array.from(new Set(predictionRows.map((row) => row.tournament_level)))
    .sort()
    .map((level) =>
      summarizeSegment(
        level,
        predictionRows.filter((row) => row.tournament_level === level),
      ),
    );

  const summary: BacktestSummary = {
    modelVersion,
    generatedAt: new Date().toISOString(),
    matchCount: predictionRows.length,
    dateRange: {
      from: predictionRows[0]?.match_date ?? null,
      to: predictionRows.at(-1)?.match_date ?? null,
    },
    overall: {
      accuracy: roundMetric(average(predictionRows.map((row) => row.favorite_won))),
      logLoss: roundMetric(average(predictionRows.map((row) => row.log_loss))),
      brierScore: roundMetric(average(predictionRows.map((row) => row.brier_score))),
      averageConfidence: roundMetric(average(predictionRows.map((row) => row.confidence))),
      averageFavoriteWinProbability: roundMetric(
        average(predictionRows.map((row) => row.favorite_win_probability)),
      ),
      favoriteWinRate: roundMetric(average(predictionRows.map((row) => row.favorite_won))),
    },
    calibrationBuckets: buildCalibrationBuckets(predictionRows),
    bySurface,
    byTournamentLevel,
  };

  await Promise.all([
    writeJsonLines(path.join(outputDir, "historical_predictions.jsonl"), predictionRows),
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
  ]);

  return summary;
}
