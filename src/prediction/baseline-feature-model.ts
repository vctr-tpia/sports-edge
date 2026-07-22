import type { MatchPrediction, PredictionFactor } from "@/src/domain/predictions/explanation";
import type { PreMatchFeatureSnapshot } from "@/src/domain/predictions/feature-snapshot";
import { projectMatchTotals } from "@/src/prediction/match-projection";

const WEIGHT_PROFILES = {
  "baseline-v1": {
    overall_elo: 0.3,
    surface_elo: 0.22,
    recent_form: 0.1,
    surface_recent_form: 0,
    surface_service_points_won: 0,
    surface_return_points_won: 0,
    opponent_quality: 0.1,
    surface_win_rate: 0.05,
    rest_days: 0.03,
    head_to_head: 0.02,
  },
  "baseline-v2": {
    overall_elo: 0.3,
    surface_elo: 0.22,
    recent_form: 0.1,
    surface_recent_form: 0.08,
    surface_service_points_won: 0,
    surface_return_points_won: 0,
    opponent_quality: 0.1,
    surface_win_rate: 0.05,
    rest_days: 0.03,
    head_to_head: 0.02,
  },
  "baseline-v3": {
    overall_elo: 0.3,
    surface_elo: 0.22,
    recent_form: 0.1,
    surface_recent_form: 0.08,
    surface_service_points_won: 0.06,
    surface_return_points_won: 0.04,
    opponent_quality: 0.1,
    surface_win_rate: 0.05,
    rest_days: 0.03,
    head_to_head: 0.02,
  },
  "baseline-v4": {
    overall_elo: 0.42,
    surface_elo: 0.33,
    recent_form: 0.03,
    surface_recent_form: 0.02,
    surface_service_points_won: 0.015,
    surface_return_points_won: 0.01,
    opponent_quality: 0.08,
    surface_win_rate: 0.02,
    rest_days: 0,
    head_to_head: 0.005,
  },
  "baseline-v5": {
    overall_elo: 0.46,
    surface_elo: 0.36,
    recent_form: 0.015,
    surface_recent_form: 0,
    surface_service_points_won: 0,
    surface_return_points_won: 0,
    opponent_quality: 0.05,
    surface_win_rate: 0,
    rest_days: 0,
    head_to_head: 0,
  },
} as const;

const SCORE_MULTIPLIERS = {
  "baseline-v1": 1,
  "baseline-v2": 1,
  "baseline-v3": 1,
  "baseline-v4": 1,
  "baseline-v5": 2.45,
} as const;

type ModelVersion = keyof typeof WEIGHT_PROFILES;
type FactorKey = keyof (typeof WEIGHT_PROFILES)["baseline-v4"];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function probabilityFromScore(score: number) {
  return 1 / (1 + Math.exp(-score));
}

function inferBestOf(snapshot: PreMatchFeatureSnapshot) {
  if (snapshot.bestOf === 3 || snapshot.bestOf === 5) {
    return snapshot.bestOf;
  }

  return snapshot.tournamentLevel === "grand_slam" ? 5 : 3;
}

function formatSurfaceLabel(surface: string) {
  return `${surface[0].toUpperCase()}${surface.slice(1)} Elo`;
}

function makeFactor(
  weights: typeof WEIGHT_PROFILES[ModelVersion],
  key: FactorKey,
  label: string,
  playerAValue: number,
  playerBValue: number,
  normalization: number,
): PredictionFactor {
  const rawEdge = playerAValue - playerBValue;
  const edgeToPlayerA = (rawEdge / normalization) * weights[key];

  return {
    key,
    label,
    weight: weights[key],
    playerAValue,
    playerBValue,
    edgeToPlayerA,
    summary: edgeToPlayerA >= 0 ? `${label} favors player A` : `${label} favors player B`,
  };
}

function modelVersionFromSnapshot(snapshot: PreMatchFeatureSnapshot): ModelVersion {
  switch (snapshot.featureVersion) {
    case "baseline-features-v5":
      return "baseline-v5";
    case "baseline-features-v4":
      return "baseline-v4";
    case "baseline-features-v3":
      return "baseline-v3";
    case "baseline-features-v2":
      return "baseline-v2";
    default:
      return "baseline-v1";
  }
}

function includeFactor(weights: typeof WEIGHT_PROFILES[ModelVersion], key: FactorKey) {
  return weights[key] > 0;
}

export function generatePredictionFromFeatureSnapshot(
  snapshot: PreMatchFeatureSnapshot,
): MatchPrediction {
  const modelVersion = modelVersionFromSnapshot(snapshot);
  const weights = WEIGHT_PROFILES[modelVersion];
  const explanation: PredictionFactor[] = [];

  if (includeFactor(weights, "overall_elo")) {
    explanation.push(
      makeFactor(
        weights,
        "overall_elo",
        "Overall Elo",
        snapshot.playerAOverallElo,
        snapshot.playerBOverallElo,
        400,
      ),
    );
  }

  if (includeFactor(weights, "surface_elo")) {
    explanation.push(
      makeFactor(
        weights,
        "surface_elo",
        formatSurfaceLabel(snapshot.surface),
        snapshot.playerASurfaceElo,
        snapshot.playerBSurfaceElo,
        400,
      ),
    );
  }

  if (includeFactor(weights, "recent_form")) {
    explanation.push(
      makeFactor(
        weights,
        "recent_form",
        "Recent Form",
        snapshot.playerARecentForm,
        snapshot.playerBRecentForm,
        100,
      ),
    );
  }

  if (includeFactor(weights, "surface_recent_form")) {
    explanation.push(
      makeFactor(
        weights,
        "surface_recent_form",
        `Recent ${snapshot.surface[0].toUpperCase()}${snapshot.surface.slice(1)} Form`,
        snapshot.playerASurfaceRecentForm ?? 50,
        snapshot.playerBSurfaceRecentForm ?? 50,
        100,
      ),
    );
  }

  if (includeFactor(weights, "surface_service_points_won")) {
    explanation.push(
      makeFactor(
        weights,
        "surface_service_points_won",
        `${snapshot.surface[0].toUpperCase()}${snapshot.surface.slice(1)} Service Strength`,
        snapshot.playerASurfaceServicePointsWon ?? 50,
        snapshot.playerBSurfaceServicePointsWon ?? 50,
        100,
      ),
    );
  }

  if (includeFactor(weights, "surface_return_points_won")) {
    explanation.push(
      makeFactor(
        weights,
        "surface_return_points_won",
        `${snapshot.surface[0].toUpperCase()}${snapshot.surface.slice(1)} Return Strength`,
        snapshot.playerASurfaceReturnPointsWon ?? 50,
        snapshot.playerBSurfaceReturnPointsWon ?? 50,
        100,
      ),
    );
  }

  if (includeFactor(weights, "opponent_quality")) {
    explanation.push(
      makeFactor(
        weights,
      "opponent_quality",
      "Opponent Quality",
      snapshot.playerAOpponentQuality,
      snapshot.playerBOpponentQuality,
      400,
      ),
    );
  }

  if (includeFactor(weights, "surface_win_rate")) {
    explanation.push(
      makeFactor(
        weights,
      "surface_win_rate",
      "Surface Win Rate",
      snapshot.playerASurfaceWinRate,
      snapshot.playerBSurfaceWinRate,
      100,
      ),
    );
  }

  if (includeFactor(weights, "rest_days")) {
    explanation.push(
      makeFactor(
        weights,
      "rest_days",
      "Rest Days",
      snapshot.playerARestDays ?? 0,
      snapshot.playerBRestDays ?? 0,
      14,
      ),
    );
  }

  if (includeFactor(weights, "head_to_head")) {
    explanation.push(
      makeFactor(
        weights,
      "head_to_head",
      "Head-to-Head",
      snapshot.playerAH2HWins,
      snapshot.playerBH2HWins,
      10,
      ),
    );
  }

  const rawScore = explanation.reduce((total, factor) => total + factor.edgeToPlayerA, 0);
  const score = rawScore * SCORE_MULTIPLIERS[modelVersion];
  const playerAWinProbability = clamp(probabilityFromScore(score), 0.01, 0.99);
  const playerBWinProbability = 1 - playerAWinProbability;
  const confidence = clamp(Math.abs(playerAWinProbability - 0.5) * 2, 0, 1);
  const projection = projectMatchTotals({
    playerAWinProbability,
    playerBWinProbability,
    bestOf: inferBestOf(snapshot),
    averageSurfaceServicePointsWon:
      ((snapshot.playerASurfaceServicePointsWon ?? 62) +
        (snapshot.playerBSurfaceServicePointsWon ?? 62)) /
      2,
  });

  return {
    matchId: snapshot.matchId,
    modelVersion,
    playerAWinProbability,
    playerBWinProbability,
    confidence,
    favoritePlayerId:
      playerAWinProbability >= playerBWinProbability ? snapshot.playerAId : snapshot.playerBId,
    explanation,
    projection,
    generatedAt: snapshot.matchDate,
  };
}
