import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdminClient } from "../src/lib/supabase-admin";

const NORMALIZED_DIR = path.join(process.cwd(), "work", "normalized", "active-atp");
const SOURCE_DIR = path.join(process.cwd(), "data", "jeff-sackmann", "atp");
const BATCH_SIZE = 500;

type PlayerRow = {
  id: string;
  external_atp_id: string;
  full_name: string;
  country_code: string | null;
  birth_date: string | null;
  handedness: "right" | "left" | "unknown";
  height_cm: number | null;
  created_at_source: string;
};

type TournamentRow = {
  id: string;
  external_tournament_id: string;
  name: string;
  season: number;
  surface: "clay" | "hard" | "grass";
  level:
    | "grand_slam"
    | "masters"
    | "tour"
    | "finals"
    | "team_event"
    | "olympics"
    | "challenger"
    | "atp_500"
    | "atp_250";
  source_level_code: string;
  start_date: string | null;
};

type MatchRow = {
  id: string;
  external_match_id: string;
  tournament_id: string;
  match_date: string;
  round: string;
  surface: "clay" | "hard" | "grass";
  best_of: number | null;
  winner_id: string;
  loser_id: string;
  score: string | null;
  minutes: number | null;
};

type MatchEntryRow = {
  id: string;
  match_id: string;
  player_id: string;
  side: "A" | "B";
  ranking_at_match: number | null;
  ranking_points_at_match: number | null;
};

type PlayerMatchStatRow = {
  id: string;
  match_id: string;
  player_id: string;
  aces: number | null;
  double_faults: number | null;
  first_serve_in_pct: number | null;
  first_serve_points_won_pct: number | null;
  second_serve_points_won_pct: number | null;
  break_points_saved_pct: number | null;
  break_points_converted_pct: number | null;
  service_points_won_pct: number | null;
  return_points_won_pct: number | null;
};

type CurrentRankingRow = {
  ranking_date: string;
  rank: string;
  player: string;
  points: string;
};

async function readJsonLines<T>(filePath: string): Promise<T[]> {
  const content = await readFile(filePath, "utf8");
  return content
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

async function readCurrentRankings(): Promise<Map<string, { rank: number; points: number | null }>> {
  const content = await readFile(path.join(SOURCE_DIR, "atp_rankings_current.csv"), "utf8");
  const lines = content.split("\n").filter(Boolean);
  const rows = lines.slice(1);
  const map = new Map<string, { rank: number; points: number | null }>();

  for (const row of rows) {
    const [ranking_date, rank, player, points] = row.split(",");
    const parsedRank = Number.parseInt(rank, 10);
    const parsedPoints = Number.parseInt(points, 10);

    if (!player || Number.isNaN(parsedRank)) {
      continue;
    }

    const existing = map.get(player);
    if (existing) {
      continue;
    }

    map.set(player, {
      rank: parsedRank,
      points: Number.isNaN(parsedPoints) ? null : parsedPoints,
    });
  }

  return map;
}

async function upsertBatches<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
  onConflict: string,
) {
  const client = getSupabaseAdminClient();

  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const batch = rows.slice(index, index + BATCH_SIZE);
    const { error } = await client.from(table).upsert(batch as Record<string, unknown>[], {
      onConflict,
      ignoreDuplicates: false,
    });

    if (error) {
      throw new Error(`Failed to upsert ${table} batch starting at ${index}: ${error.message}`);
    }
  }
}

async function main() {
  const currentRankings = await readCurrentRankings();
  const players = await readJsonLines<PlayerRow>(path.join(NORMALIZED_DIR, "players.jsonl"));
  const tournaments = await readJsonLines<TournamentRow>(path.join(NORMALIZED_DIR, "tournaments.jsonl"));
  const matches = await readJsonLines<MatchRow>(path.join(NORMALIZED_DIR, "matches.jsonl"));
  const matchEntries = await readJsonLines<MatchEntryRow>(path.join(NORMALIZED_DIR, "match_entries.jsonl"));
  const playerMatchStats = await readJsonLines<PlayerMatchStatRow>(
    path.join(NORMALIZED_DIR, "player_match_stats.jsonl"),
  );

  const playerPayload = players.map((player) => {
    const ranking = currentRankings.get(player.external_atp_id);
    return {
      id: player.id,
      external_atp_id: player.external_atp_id,
      full_name: player.full_name,
      country_code: player.country_code,
      birth_date: player.birth_date,
      handedness: player.handedness,
      height_cm: player.height_cm,
      current_rank: ranking?.rank ?? null,
      current_rank_points: ranking?.points ?? null,
    };
  });

  const tournamentPayload = tournaments.map((tournament) => ({
    id: tournament.id,
    external_tournament_id: tournament.external_tournament_id,
    name: tournament.name,
    season: tournament.season,
    surface: tournament.surface,
    level: tournament.level,
    source_level_code: tournament.source_level_code,
    start_date: tournament.start_date,
  }));

  const matchPayload = matches.map((match) => ({
    id: match.id,
    external_match_id: match.external_match_id,
    tournament_id: match.tournament_id,
    match_date: match.match_date,
    round: match.round,
    surface: match.surface,
    best_of: match.best_of,
    winner_id: match.winner_id,
    loser_id: match.loser_id,
    score: match.score,
    minutes: match.minutes,
  }));

  await upsertBatches("players", playerPayload, "id");
  await upsertBatches("tournaments", tournamentPayload, "id");
  await upsertBatches("matches", matchPayload, "id");
  await upsertBatches("match_entries", matchEntries, "id");
  await upsertBatches("player_match_stats", playerMatchStats, "id");

  console.log(
    JSON.stringify(
      {
        players: playerPayload.length,
        tournaments: tournamentPayload.length,
        matches: matchPayload.length,
        matchEntries: matchEntries.length,
        playerMatchStats: playerMatchStats.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
