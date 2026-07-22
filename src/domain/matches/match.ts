import type { MatchRound, Surface, TournamentLevel } from "@/src/domain/shared";

export type ScheduledMatch = {
  id: string;
  tournamentId: string;
  tournamentName: string;
  surface: Surface;
  round: MatchRound;
  level: TournamentLevel;
  startDate: string;
  playerAId: string;
  playerBId: string;
};
