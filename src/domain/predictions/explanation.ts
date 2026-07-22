export type PredictionFactorKey =
  | "overall_elo"
  | "surface_elo"
  | "recent_form"
  | "surface_recent_form"
  | "surface_service_points_won"
  | "surface_return_points_won"
  | "opponent_quality"
  | "surface_win_rate"
  | "rest_days"
  | "head_to_head";

export type PredictionFactor = {
  key: PredictionFactorKey;
  label: string;
  weight: number;
  playerAValue: number;
  playerBValue: number;
  edgeToPlayerA: number;
  summary: string;
};

export type MatchProjection = {
  expectedTotalSets: number;
  expectedTotalGames: number;
  favoriteStraightSetsProbability: number;
  decidingSetProbability: number;
};

export type MatchPrediction = {
  matchId: string;
  modelVersion: string;
  playerAWinProbability: number;
  playerBWinProbability: number;
  confidence: number;
  favoritePlayerId: string;
  explanation: PredictionFactor[];
  projection: MatchProjection;
  generatedAt: string;
};
