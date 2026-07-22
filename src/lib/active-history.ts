import { access, readFile } from "node:fs/promises";
import path from "node:path";
import type { MatchRound, Surface, TournamentLevel } from "@/src/domain/shared";
import { getSupabaseAdminClient } from "@/src/lib/supabase-admin";

const ACTIVE_DIR = path.join(process.cwd(), "work", "normalized", "active-atp");
const PAGE_SIZE = 1000;

export type ActivePlayer = {
  id: string;
  external_atp_id: string;
  full_name: string;
  country_code: string | null;
};

export type ActiveTournament = {
  id: string;
  external_tournament_id: string;
  name: string;
  season: number;
  surface: Surface;
  level: TournamentLevel;
  source_level_code?: string;
  start_date: string | null;
};

export type ActiveMatch = {
  id: string;
  external_match_id: string;
  tournament_id: string;
  match_date: string;
  round: MatchRound;
  surface: Surface;
  best_of: number | null;
  winner_id: string;
  loser_id: string;
  score: string | null;
  minutes: number | null;
};

export type ActivePlayerMatchStat = {
  match_id: string;
  player_id: string;
  service_points_won_pct: number | null;
  return_points_won_pct: number | null;
};

async function readJsonLines<T>(filePath: string): Promise<T[]> {
  const content = await readFile(filePath, "utf8");
  return content
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function fetchAllRows<T>(table: string, columns: string): Promise<T[]> {
  const client = getSupabaseAdminClient();
  const rows: T[] = [];

  for (let start = 0; ; start += PAGE_SIZE) {
    const { data, error } = await client
      .from(table)
      .select(columns)
      .range(start, start + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to load ${table} from Supabase: ${error.message}`);
    }

    const batch = ((data ?? []) as T[]);
    rows.push(...batch);

    if (batch.length < PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

export async function loadActivePlayers() {
  const playersPath = path.join(ACTIVE_DIR, "players.jsonl");
  if (await fileExists(playersPath)) {
    return readJsonLines<ActivePlayer>(playersPath);
  }

  return fetchAllRows<ActivePlayer>("players", "id, external_atp_id, full_name, country_code");
}

export async function loadActiveHistoricalDataset() {
  const tournamentsPath = path.join(ACTIVE_DIR, "tournaments.jsonl");
  const matchesPath = path.join(ACTIVE_DIR, "matches.jsonl");
  const playerMatchStatsPath = path.join(ACTIVE_DIR, "player_match_stats.jsonl");

  if (
    (await fileExists(tournamentsPath)) &&
    (await fileExists(matchesPath)) &&
    (await fileExists(playerMatchStatsPath))
  ) {
    const [tournaments, matches, playerMatchStats] = await Promise.all([
      readJsonLines<ActiveTournament>(tournamentsPath),
      readJsonLines<ActiveMatch>(matchesPath),
      readJsonLines<ActivePlayerMatchStat>(playerMatchStatsPath),
    ]);

    return {
      tournaments,
      matches,
      playerMatchStats,
      source: "local" as const,
    };
  }

  const [tournaments, matches, playerMatchStats] = await Promise.all([
    fetchAllRows<ActiveTournament>(
      "tournaments",
      "id, external_tournament_id, name, season, surface, level, start_date",
    ),
    fetchAllRows<ActiveMatch>(
      "matches",
      "id, external_match_id, tournament_id, match_date, round, surface, best_of, winner_id, loser_id, score, minutes",
    ),
    fetchAllRows<ActivePlayerMatchStat>(
      "player_match_stats",
      "match_id, player_id, service_points_won_pct, return_points_won_pct",
    ),
  ]);

  return {
    tournaments,
    matches,
    playerMatchStats,
    source: "supabase" as const,
  };
}
