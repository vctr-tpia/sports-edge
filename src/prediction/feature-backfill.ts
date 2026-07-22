import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Surface, TournamentLevel } from "../domain/shared";
import {
  applyMatchResult,
  averageOpponentQuality,
  getOrCreateState,
  pairKey,
  recentFormIndex,
  recentSurfaceReturnPointsWon,
  recentSurfaceFormIndex,
  recentSurfaceServicePointsWon,
  restDays,
  roundMetric,
  roundOrder,
  roundRating,
  surfaceWinRate,
  type PlayerFeatureState,
} from "./feature-state";

const ACTIVE_DIR = path.join(process.cwd(), "work", "normalized", "active-atp");
const OUTPUT_DIR = path.join(process.cwd(), "work", "features", "atp-match-features");
const FEATURE_VERSION = "baseline-features-v3";

type NormalizedTournament = {
  id: string;
  external_tournament_id: string;
  name: string;
  season: number;
  surface: Surface;
  level: TournamentLevel;
  source_level_code: string;
  start_date: string | null;
};

type NormalizedMatch = {
  id: string;
  external_match_id: string;
  tournament_id: string;
  match_date: string;
  round: string;
  surface: Surface;
  best_of: number | null;
  winner_id: string;
  loser_id: string;
  score: string | null;
  minutes: number | null;
};

type NormalizedPlayerMatchStat = {
  match_id: string;
  player_id: string;
  service_points_won_pct: number | null;
  return_points_won_pct: number | null;
};

type MatchFeatureRow = {
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
  player_a_surface_recent_form: number;
  player_b_surface_recent_form: number;
  player_a_surface_service_points_won: number;
  player_b_surface_service_points_won: number;
  player_a_surface_return_points_won: number;
  player_b_surface_return_points_won: number;
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
  player_a_surface_recent_form_edge: number;
  player_a_surface_service_points_won_edge: number;
  player_a_surface_return_points_won_edge: number;
  player_a_surface_win_rate_edge: number;
  player_a_opponent_quality_edge: number;
  player_a_rest_days_edge: number | null;
  player_a_h2h_edge: number;
};

type FeatureSummary = {
  featureVersion: string;
  matchCount: number;
  playerCount: number;
  dateRange: {
    from: string | null;
    to: string | null;
  };
};

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

export async function computeHistoricalMatchFeatures() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  for (const fileName of ["historical_match_features.jsonl", "summary.json"]) {
    await rm(path.join(OUTPUT_DIR, fileName), { force: true });
  }

  const tournaments = await readJsonLines<NormalizedTournament>(
    path.join(ACTIVE_DIR, "tournaments.jsonl"),
  );
  const [matches, playerMatchStats] = await Promise.all([
    readJsonLines<NormalizedMatch>(path.join(ACTIVE_DIR, "matches.jsonl")),
    readJsonLines<NormalizedPlayerMatchStat>(path.join(ACTIVE_DIR, "player_match_stats.jsonl")),
  ]);

  const tournamentById = new Map(tournaments.map((tournament) => [tournament.id, tournament]));
  const playerMatchStatByKey = new Map(
    playerMatchStats.map((row) => [`${row.match_id}:${row.player_id}`, row]),
  );
  const states = new Map<string, PlayerFeatureState>();
  const headToHead = new Map<string, Record<string, number>>();

  const sortedMatches = [...matches].sort((left, right) => {
    const byDate = left.match_date.localeCompare(right.match_date);
    if (byDate !== 0) {
      return byDate;
    }

    const byRound = roundOrder(left.round) - roundOrder(right.round);
    if (byRound !== 0) {
      return byRound;
    }

    return left.external_match_id.localeCompare(right.external_match_id);
  });

  const featureRows: MatchFeatureRow[] = [];

  for (const match of sortedMatches) {
    const tournament = tournamentById.get(match.tournament_id);
    if (!tournament) {
      continue;
    }

    const winnerState = getOrCreateState(states, match.winner_id);
    const loserState = getOrCreateState(states, match.loser_id);
    const [playerAId, playerBId] = [match.winner_id, match.loser_id].sort();
    const playerAState = playerAId === match.winner_id ? winnerState : loserState;
    const playerBState = playerBId === match.winner_id ? winnerState : loserState;

    const h2hKey = pairKey(playerAId, playerBId);
    const h2hRecord = headToHead.get(h2hKey) ?? {};
    const playerAH2HWins = h2hRecord[playerAId] ?? 0;
    const playerBH2HWins = h2hRecord[playerBId] ?? 0;

    const playerARestDays = restDays(playerAState.lastMatchDate, match.match_date);
    const playerBRestDays = restDays(playerBState.lastMatchDate, match.match_date);
    const winnerMatchStat = playerMatchStatByKey.get(`${match.id}:${match.winner_id}`);
    const loserMatchStat = playerMatchStatByKey.get(`${match.id}:${match.loser_id}`);

    const featureRow: MatchFeatureRow = {
      match_id: match.id,
      feature_version: FEATURE_VERSION,
      match_date: match.match_date,
      tournament_id: match.tournament_id,
      tournament_level: tournament.level,
      surface: match.surface,
      round: match.round,
      player_a_id: playerAId,
      player_b_id: playerBId,
      actual_winner_id: match.winner_id,
      actual_loser_id: match.loser_id,
      player_a_overall_elo: roundRating(playerAState.overallElo),
      player_b_overall_elo: roundRating(playerBState.overallElo),
      player_a_surface_elo: roundRating(playerAState.surfaceElos[match.surface]),
      player_b_surface_elo: roundRating(playerBState.surfaceElos[match.surface]),
      player_a_recent_form: recentFormIndex(playerAState.recentResults),
      player_b_recent_form: recentFormIndex(playerBState.recentResults),
      player_a_surface_recent_form: recentSurfaceFormIndex(playerAState, match.surface),
      player_b_surface_recent_form: recentSurfaceFormIndex(playerBState, match.surface),
      player_a_surface_service_points_won: recentSurfaceServicePointsWon(playerAState, match.surface),
      player_b_surface_service_points_won: recentSurfaceServicePointsWon(playerBState, match.surface),
      player_a_surface_return_points_won: recentSurfaceReturnPointsWon(playerAState, match.surface),
      player_b_surface_return_points_won: recentSurfaceReturnPointsWon(playerBState, match.surface),
      player_a_surface_win_rate: surfaceWinRate(playerAState, match.surface),
      player_b_surface_win_rate: surfaceWinRate(playerBState, match.surface),
      player_a_opponent_quality: averageOpponentQuality(playerAState.recentOpponentElos),
      player_b_opponent_quality: averageOpponentQuality(playerBState.recentOpponentElos),
      player_a_rest_days: playerARestDays,
      player_b_rest_days: playerBRestDays,
      player_a_h2h_wins: playerAH2HWins,
      player_b_h2h_wins: playerBH2HWins,
      player_a_overall_elo_edge: roundMetric(playerAState.overallElo - playerBState.overallElo),
      player_a_surface_elo_edge: roundMetric(
        playerAState.surfaceElos[match.surface] - playerBState.surfaceElos[match.surface],
      ),
      player_a_recent_form_edge: roundMetric(
        recentFormIndex(playerAState.recentResults) - recentFormIndex(playerBState.recentResults),
      ),
      player_a_surface_recent_form_edge: roundMetric(
        recentSurfaceFormIndex(playerAState, match.surface) -
          recentSurfaceFormIndex(playerBState, match.surface),
      ),
      player_a_surface_service_points_won_edge: roundMetric(
        recentSurfaceServicePointsWon(playerAState, match.surface) -
          recentSurfaceServicePointsWon(playerBState, match.surface),
      ),
      player_a_surface_return_points_won_edge: roundMetric(
        recentSurfaceReturnPointsWon(playerAState, match.surface) -
          recentSurfaceReturnPointsWon(playerBState, match.surface),
      ),
      player_a_surface_win_rate_edge: roundMetric(
        surfaceWinRate(playerAState, match.surface) - surfaceWinRate(playerBState, match.surface),
      ),
      player_a_opponent_quality_edge: roundMetric(
        averageOpponentQuality(playerAState.recentOpponentElos) -
          averageOpponentQuality(playerBState.recentOpponentElos),
      ),
      player_a_rest_days_edge:
        playerARestDays === null || playerBRestDays === null
          ? null
          : playerARestDays - playerBRestDays,
      player_a_h2h_edge: playerAH2HWins - playerBH2HWins,
    };

    featureRows.push(featureRow);

    const updatedH2H = { ...h2hRecord };
    updatedH2H[match.winner_id] = (updatedH2H[match.winner_id] ?? 0) + 1;
    updatedH2H[match.loser_id] = updatedH2H[match.loser_id] ?? 0;
    headToHead.set(h2hKey, updatedH2H);

    applyMatchResult(
      winnerState,
      loserState,
      match,
      tournament,
      {
        servicePointsWonPct: winnerMatchStat?.service_points_won_pct ?? null,
        returnPointsWonPct: winnerMatchStat?.return_points_won_pct ?? null,
      },
      {
        servicePointsWonPct: loserMatchStat?.service_points_won_pct ?? null,
        returnPointsWonPct: loserMatchStat?.return_points_won_pct ?? null,
      },
    );
  }

  const playerIds = new Set<string>();
  for (const row of featureRows) {
    playerIds.add(row.player_a_id);
    playerIds.add(row.player_b_id);
  }

  const summary: FeatureSummary = {
    featureVersion: FEATURE_VERSION,
    matchCount: featureRows.length,
    playerCount: playerIds.size,
    dateRange: {
      from: featureRows[0]?.match_date ?? null,
      to: featureRows.at(-1)?.match_date ?? null,
    },
  };

  await writeJsonLines(path.join(OUTPUT_DIR, "historical_match_features.jsonl"), featureRows);
  await writeFile(path.join(OUTPUT_DIR, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  return summary;
}
