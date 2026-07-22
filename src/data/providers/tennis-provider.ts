import type { MatchRound, Surface, TournamentLevel } from "@/src/domain/shared";

export type ProviderScheduledMatch = {
  provider: string;
  providerMatchId: string;
  providerTournamentId: string;
  providerPlayerAId: string;
  providerPlayerBId: string;
  playerAName: string;
  playerBName: string;
  playerACountryCode: string | null;
  playerBCountryCode: string | null;
  tournamentName: string;
  season: number;
  tournamentCountryCode: string | null;
  city: string | null;
  surface: Surface;
  level: TournamentLevel;
  round: MatchRound;
  matchDate: string;
  scheduledAt: string | null;
  providerTimeLabel: string | null;
  startDate: string;
  endDate: string;
  bestOf: number;
};

export type ProviderMatchStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export type ProviderMatchResult = {
  provider: string;
  providerEventId: string | null;
  providerMatchKey: string | null;
  participant1Name: string;
  participant2Name: string;
  status: ProviderMatchStatus;
  providerStatus: string | null;
  startTimestamp: number | null;
  score: string | null;
  winnerSide: 1 | 2 | null;
};

export interface TennisScheduleProvider {
  fetchScheduledMatches(dateFrom: string, dateTo: string): Promise<ProviderScheduledMatch[]>;
  fetchMatchResult(playerAName: string, playerBName: string, matchDate: string): Promise<ProviderMatchResult | null>;
}
