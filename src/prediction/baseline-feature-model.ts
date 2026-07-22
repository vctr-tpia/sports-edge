import type { MatchPrediction, PredictionFactor } from "@/src/domain/predictions/explanation";
import type { PreMatchFeatureSnapshot } from "@/src/domain/predictions/feature-snapshot";
import { projectMatchTotals } from "@/src/prediction/match-projection";

const FACTOR_WEIGHTS = {
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
} as const;

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
  key: keyof typeof FACTOR_WEIGHTS,
  label: string,
  playerAValue: number,
  playerBValue: number,
  normalization: number,
): PredictionFactor {
  const rawEdge = playerAValue - playerBValue;
  const edgeToPlayerA = (rawEdge / normalization) * FACTOR_WEIGHTS[key];

  return {
    key,
    label,
    weight: FACTOR_WEIGHTS[key],
    playerAValue,
    playerBValue,
    edgeToPlayerA,
    summary: edgeToPlayerA >= 0 ? `${label} favors player A` : `${label} favors player B`,
  };
}

function isBaselineV2(snapshot: PreMatchFeatureSnapshot) {
  return snapshot.featureVersion === "baseline-features-v2";
}

function isBaselineV3(snapshot: PreMatchFeatureSnapshot) {
  return snapshot.featureVersion === "baseline-features-v3";
}

export function generatePredictionFromFeatureSnapshot(
  snapshot: PreMatchFeatureSnapshot,
): MatchPrediction {
  const explanation: PredictionFactor[] = [
    makeFactor(
      "overall_elo",
      "Overall Elo",
      snapshot.playerAOverallElo,
      snapshot.playerBOverallElo,
      400,
    ),
    makeFactor(
      "surface_elo",
      formatSurfaceLabel(snapshot.surface),
      snapshot.playerASurfaceElo,
      snapshot.playerBSurfaceElo,
      400,
    ),
    makeFactor(
      "recent_form",
      "Recent Form",
      snapshot.playerARecentForm,
      snapshot.playerBRecentForm,
      100,
    ),
  ];

  if (isBaselineV2(snapshot) || isBaselineV3(snapshot)) {
    explanation.push(
      makeFactor(
        "surface_recent_form",
        `Recent ${snapshot.surface[0].toUpperCase()}${snapshot.surface.slice(1)} Form`,
        snapshot.playerASurfaceRecentForm ?? 50,
        snapshot.playerBSurfaceRecentForm ?? 50,
        100,
      ),
    );
  }

  if (isBaselineV3(snapshot)) {
    explanation.push(
      makeFactor(
        "surface_service_points_won",
        `${snapshot.surface[0].toUpperCase()}${snapshot.surface.slice(1)} Service Strength`,
        snapshot.playerASurfaceServicePointsWon ?? 50,
        snapshot.playerBSurfaceServicePointsWon ?? 50,
        100,
      ),
      makeFactor(
        "surface_return_points_won",
        `${snapshot.surface[0].toUpperCase()}${snapshot.surface.slice(1)} Return Strength`,
        snapshot.playerASurfaceReturnPointsWon ?? 50,
        snapshot.playerBSurfaceReturnPointsWon ?? 50,
        100,
      ),
    );
  }

  explanation.push(
    makeFactor(
      "opponent_quality",
      "Opponent Quality",
      snapshot.playerAOpponentQuality,
      snapshot.playerBOpponentQuality,
      400,
    ),
    makeFactor(
      "surface_win_rate",
      "Surface Win Rate",
      snapshot.playerASurfaceWinRate,
      snapshot.playerBSurfaceWinRate,
      100,
    ),
    makeFactor(
      "rest_days",
      "Rest Days",
      snapshot.playerARestDays ?? 0,
      snapshot.playerBRestDays ?? 0,
      14,
    ),
    makeFactor(
      "head_to_head",
      "Head-to-Head",
      snapshot.playerAH2HWins,
      snapshot.playerBH2HWins,
      10,
    ),
  );

  const score = explanation.reduce((total, factor) => total + factor.edgeToPlayerA, 0);
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
    modelVersion: isBaselineV3(snapshot)
      ? "baseline-v3"
      : isBaselineV2(snapshot)
        ? "baseline-v2"
        : "baseline-v1",
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
