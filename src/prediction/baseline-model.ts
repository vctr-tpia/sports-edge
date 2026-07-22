import type { PlayerSnapshot } from "@/src/domain/players/player";
import type { MatchPrediction, PredictionFactor } from "@/src/domain/predictions/explanation";
import type { ScheduledMatch } from "@/src/domain/matches/match";
import type { Surface } from "@/src/domain/shared";
import { projectMatchTotals } from "@/src/prediction/match-projection";

const FACTOR_WEIGHTS = {
  overall_elo: 0.35,
  surface_elo: 0.25,
  recent_form: 0.15,
  opponent_quality: 0.1,
  surface_win_rate: 0.05,
  rest_days: 0.05,
  head_to_head: 0.05,
} as const;

export type BaselinePredictionInput = {
  match: ScheduledMatch;
  playerA: PlayerSnapshot;
  playerB: PlayerSnapshot;
  headToHeadEdge: number;
  opponentQualityEdge: number;
  restDaysEdge: number;
  generatedAt: string;
};

function probabilityFromScore(score: number) {
  return 1 / (1 + Math.exp(-score));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function inferBestOf(match: ScheduledMatch) {
  return match.level === "grand_slam" ? 5 : 3;
}

function getSurfaceElo(player: PlayerSnapshot, surface: Surface) {
  return player.surfaceElos[surface];
}

function getSurfaceWinRate(player: PlayerSnapshot, surface: Surface) {
  return player.surfaceWinRate[surface];
}

function factor(
  key: keyof typeof FACTOR_WEIGHTS,
  label: string,
  playerAValue: number,
  playerBValue: number,
  normalization: number,
): PredictionFactor {
  const rawEdge = playerAValue - playerBValue;
  const weightedEdge = (rawEdge / normalization) * FACTOR_WEIGHTS[key];

  return {
    key,
    label,
    weight: FACTOR_WEIGHTS[key],
    playerAValue,
    playerBValue,
    edgeToPlayerA: weightedEdge,
    summary:
      weightedEdge >= 0
        ? `${label} favors player A`
        : `${label} favors player B`,
  };
}

export function generateBaselinePrediction({
  match,
  playerA,
  playerB,
  headToHeadEdge,
  opponentQualityEdge,
  restDaysEdge,
  generatedAt,
}: BaselinePredictionInput): MatchPrediction {
  const explanation = [
    factor("overall_elo", "Overall Elo", playerA.overallElo, playerB.overallElo, 400),
    factor(
      "surface_elo",
      `${match.surface[0].toUpperCase()}${match.surface.slice(1)} Elo`,
      getSurfaceElo(playerA, match.surface),
      getSurfaceElo(playerB, match.surface),
      400,
    ),
    factor("recent_form", "Recent Form", playerA.recentFormIndex, playerB.recentFormIndex, 100),
    factor("opponent_quality", "Opponent Quality", opponentQualityEdge, 0, 100),
    factor(
      "surface_win_rate",
      "Surface Win Rate",
      getSurfaceWinRate(playerA, match.surface),
      getSurfaceWinRate(playerB, match.surface),
      1,
    ),
    factor("rest_days", "Rest Days", restDaysEdge, 0, 7),
    factor("head_to_head", "Head-to-Head", headToHeadEdge, 0, 10),
  ];

  const score = explanation.reduce((total, item) => total + item.edgeToPlayerA, 0);
  const playerAWinProbability = clamp(probabilityFromScore(score), 0.01, 0.99);
  const playerBWinProbability = 1 - playerAWinProbability;
  const confidence = clamp(Math.abs(playerAWinProbability - 0.5) * 2, 0, 1);
  const projection = projectMatchTotals({
    playerAWinProbability,
    playerBWinProbability,
    bestOf: inferBestOf(match),
  });

  return {
    matchId: match.id,
    modelVersion: "baseline-v1",
    playerAWinProbability,
    playerBWinProbability,
    confidence,
    favoritePlayerId: playerAWinProbability >= playerBWinProbability ? playerA.id : playerB.id,
    explanation,
    projection,
    generatedAt,
  };
}
