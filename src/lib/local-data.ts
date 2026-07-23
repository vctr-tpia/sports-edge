import { readFile } from "node:fs/promises";
import path from "node:path";
import type { MatchPrediction } from "@/src/domain/predictions/explanation";
import type {
  HistoricalMatchFeatureSnapshot,
  PreMatchFeatureSnapshot,
} from "@/src/domain/predictions/feature-snapshot";
import type { MatchRound, Surface, TournamentLevel } from "@/src/domain/shared";
import { generatePredictionFromFeatureSnapshot } from "@/src/prediction/baseline-feature-model";

const ACTIVE_DIR = path.join(process.cwd(), "work", "normalized", "active-atp");
const FEATURES_DIR = path.join(process.cwd(), "work", "features", "atp-match-features");
const UPCOMING_DIR = path.join(process.cwd(), "work", "upcoming", "atp");

type LocalPlayer = {
  id: string;
  external_atp_id: string;
  full_name: string;
  country_code: string | null;
};

type LocalTournament = {
  id: string;
  name: string;
  surface: string;
  level: string;
};

type UpcomingLocalMatch = {
  id: string;
  external_match_id: string;
  external_tournament_id: string;
  tournament_name: string;
  season: number;
  country_code: string | null;
  city: string | null;
  surface: Surface;
  tournament_level: TournamentLevel;
  match_date: string;
  scheduled_at: string | null;
  provider_time_label: string | null;
  tournament_start_date: string | null;
  tournament_end_date: string | null;
  round: MatchRound;
  best_of: number | null;
  player_a_id: string;
  player_b_id: string;
  source: string;
  status: "scheduled";
};

async function readJsonLines<T>(filePath: string): Promise<T[]> {
  const content = await readFile(filePath, "utf8");
  return content
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as T;
}

async function readOptionalJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    return await readJsonFile<T>(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function getLocalPlayersById() {
  const players = await readJsonLines<LocalPlayer>(path.join(ACTIVE_DIR, "players.jsonl"));
  return new Map(players.map((player) => [player.id, player]));
}

export async function getLocalTournamentsById() {
  const tournaments = await readJsonLines<LocalTournament>(
    path.join(ACTIVE_DIR, "tournaments.jsonl"),
  );
  return new Map(tournaments.map((tournament) => [tournament.id, tournament]));
}

export async function getHistoricalFeatureSnapshots(limit?: number) {
  const snapshots = await readJsonLines<{
    match_id: string;
    feature_version: string;
    match_date: string;
    tournament_id: string;
    tournament_level: TournamentLevel;
    surface: Surface;
    round: MatchRound;
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
  }>(
    path.join(FEATURES_DIR, "historical_match_features.jsonl"),
  );

  const mapped = snapshots.map(
    (row) =>
      ({
        matchId: row.match_id,
        featureVersion: row.feature_version,
        matchDate: row.match_date,
        tournamentId: row.tournament_id,
        tournamentLevel: row.tournament_level,
        bestOf: row.tournament_level === "grand_slam" ? 5 : 3,
        surface: row.surface,
        round: row.round,
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
      }) satisfies HistoricalMatchFeatureSnapshot,
  );

  const sorted = mapped.sort((left, right) => {
    const byDate = right.matchDate.localeCompare(left.matchDate);
    if (byDate !== 0) {
      return byDate;
    }

    return left.matchId.localeCompare(right.matchId);
  });

  return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
}

export async function getUpcomingPredictionSnapshots(limit?: number) {
  const [matches, snapshots] = await Promise.all([
    readJsonLines<UpcomingLocalMatch>(path.join(UPCOMING_DIR, "upcoming_matches.jsonl")),
    readJsonLines<{
      upcoming_match_id: string;
      feature_version: string;
      match_date: string;
      surface: Surface;
      tournament_level: TournamentLevel;
      round: MatchRound;
      player_a_id: string;
      player_b_id: string;
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
    }>(path.join(UPCOMING_DIR, "upcoming_match_feature_snapshots.jsonl")),
  ]);

  const matchById = new Map(matches.map((match) => [match.id, match]));
  const mapped = snapshots.map((row) => {
    const match = matchById.get(row.upcoming_match_id);
    if (!match) {
      throw new Error(`Missing upcoming match for feature snapshot ${row.upcoming_match_id}`);
    }

    const snapshot: PreMatchFeatureSnapshot = {
      matchId: row.upcoming_match_id,
      featureVersion: row.feature_version,
      matchDate: row.match_date,
      tournamentId: match.external_tournament_id,
      tournamentLevel: row.tournament_level,
      bestOf: match.best_of,
      surface: row.surface,
      round: row.round,
      playerAId: row.player_a_id,
      playerBId: row.player_b_id,
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

    return {
      match,
      snapshot,
      prediction: generatePredictionFromFeatureSnapshot(snapshot),
    };
  });

  const sorted = mapped.sort((left, right) => {
    const byDate = left.match.match_date.localeCompare(right.match.match_date);
    if (byDate !== 0) {
      return byDate;
    }

    return left.match.id.localeCompare(right.match.id);
  });

  return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
}

export async function getUpcomingPredictionSummary() {
  return readJsonFile<{
    generatedAt: string;
    source: string;
    tournamentCount: number;
    upcomingMatchCount: number;
    playerCount: number;
    dateRange: {
      from: string | null;
      to: string | null;
    };
  }>(path.join(UPCOMING_DIR, "summary.json"));
}

export async function getUpcomingRefreshHealth() {
  return readOptionalJsonFile<{
    generatedAt: string;
    provider: string;
    status: "healthy" | "warning" | "rate_limited";
    message: string;
    referenceDate: string;
    dateTo: string;
    syncStatus: string;
    predictionStatus: string;
    loadStatus: string;
  }>(path.join(UPCOMING_DIR, "refresh-health.json"));
}

export async function getMatchDetailById(matchId: string): Promise<
  | {
      kind: "upcoming" | "historical";
      match: {
        id: string;
        matchDate: string;
        tournamentName: string;
        city?: string | null;
        countryCode?: string | null;
        scheduledAt?: string | null;
        providerTimeLabel?: string | null;
        tournamentStartDate?: string | null;
        tournamentEndDate?: string | null;
        bestOf?: number | null;
      };
      snapshot: PreMatchFeatureSnapshot | HistoricalMatchFeatureSnapshot;
      prediction: MatchPrediction;
      actualWinnerName?: string | null;
    }
  | null
> {
  const [playersById, tournamentsById, historical, upcoming] = await Promise.all([
    getLocalPlayersById(),
    getLocalTournamentsById(),
    getHistoricalFeatureSnapshots(),
    getUpcomingPredictionSnapshots(),
  ]);

  const historicalMatch = historical.find((snapshot) => snapshot.matchId === matchId);
  if (historicalMatch) {
    const tournament = tournamentsById.get(historicalMatch.tournamentId);
    const actualWinner = playersById.get(historicalMatch.actualWinnerId);

    return {
      kind: "historical",
      match: {
        id: historicalMatch.matchId,
        matchDate: historicalMatch.matchDate,
        tournamentName: tournament?.name ?? historicalMatch.tournamentId,
        city: null,
        countryCode: null,
        scheduledAt: null,
        providerTimeLabel: null,
        tournamentStartDate: null,
        tournamentEndDate: null,
        bestOf: null,
      },
      snapshot: historicalMatch,
      prediction: generatePredictionFromFeatureSnapshot(historicalMatch),
      actualWinnerName: actualWinner?.full_name ?? historicalMatch.actualWinnerId,
    };
  }

  const upcomingMatch = upcoming.find((entry) => entry.snapshot.matchId === matchId);
  if (upcomingMatch) {
    return {
      kind: "upcoming",
      match: {
        id: upcomingMatch.snapshot.matchId,
        matchDate: upcomingMatch.snapshot.matchDate,
        tournamentName: upcomingMatch.match.tournament_name,
        city: upcomingMatch.match.city,
        countryCode: upcomingMatch.match.country_code,
        scheduledAt: upcomingMatch.match.scheduled_at,
        providerTimeLabel: upcomingMatch.match.provider_time_label,
        tournamentStartDate: upcomingMatch.match.tournament_start_date,
        tournamentEndDate: upcomingMatch.match.tournament_end_date,
        bestOf: upcomingMatch.match.best_of,
      },
      snapshot: upcomingMatch.snapshot,
      prediction: upcomingMatch.prediction,
      actualWinnerName: null,
    };
  }

  return null;
}
