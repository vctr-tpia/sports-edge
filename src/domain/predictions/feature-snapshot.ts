import type { MatchRound, Surface, TournamentLevel } from "@/src/domain/shared";

export type PreMatchFeatureSnapshot = {
  matchId: string;
  featureVersion: string;
  matchDate: string;
  tournamentId: string;
  tournamentLevel: TournamentLevel;
  bestOf?: number | null;
  surface: Surface;
  round: MatchRound;
  playerAId: string;
  playerBId: string;
  playerAOverallElo: number;
  playerBOverallElo: number;
  playerASurfaceElo: number;
  playerBSurfaceElo: number;
  playerARecentForm: number;
  playerBRecentForm: number;
  playerASurfaceRecentForm?: number;
  playerBSurfaceRecentForm?: number;
  playerASurfaceServicePointsWon?: number;
  playerBSurfaceServicePointsWon?: number;
  playerASurfaceReturnPointsWon?: number;
  playerBSurfaceReturnPointsWon?: number;
  playerASurfaceWinRate: number;
  playerBSurfaceWinRate: number;
  playerAOpponentQuality: number;
  playerBOpponentQuality: number;
  playerARestDays: number | null;
  playerBRestDays: number | null;
  playerAH2HWins: number;
  playerBH2HWins: number;
  playerAOverallEloEdge: number;
  playerASurfaceEloEdge: number;
  playerARecentFormEdge: number;
  playerASurfaceRecentFormEdge?: number;
  playerASurfaceServicePointsWonEdge?: number;
  playerASurfaceReturnPointsWonEdge?: number;
  playerASurfaceWinRateEdge: number;
  playerAOpponentQualityEdge: number;
  playerARestDaysEdge: number | null;
  playerAH2HEdge: number;
};

export type HistoricalMatchFeatureSnapshot = PreMatchFeatureSnapshot & {
  actualWinnerId: string;
  actualLoserId: string;
};

export type MatchFeatureSnapshot = HistoricalMatchFeatureSnapshot;
