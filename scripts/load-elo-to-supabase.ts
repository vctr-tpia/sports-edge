import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdminClient } from "../src/lib/supabase-admin";

const ELO_DIR = path.join(process.cwd(), "work", "ratings", "elo-backfill");
const ACTIVE_DIR = path.join(process.cwd(), "work", "normalized", "active-atp");
const BATCH_SIZE = 500;

type ActivePlayerRow = {
  id: string;
  external_atp_id: string;
  full_name: string;
  country_code: string | null;
  birth_date: string | null;
  handedness: "right" | "left" | "unknown";
  height_cm: number | null;
};

type CurrentRatingRow = {
  player_id: string;
  overall_elo: number;
  clay_elo: number;
  hard_elo: number;
  grass_elo: number;
  recent_form_index: number;
  matches_played: number;
  last_match_date: string | null;
};

type RatingHistoryRow = {
  player_id: string;
  rating_date: string;
  overall_elo: number;
  clay_elo: number;
  hard_elo: number;
  grass_elo: number;
  recent_form_index: number;
};

async function readJsonLines<T>(filePath: string): Promise<T[]> {
  const content = await readFile(filePath, "utf8");
  return content
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
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
  const activePlayers = await readJsonLines<ActivePlayerRow>(path.join(ACTIVE_DIR, "players.jsonl"));
  const currentRatings = await readJsonLines<CurrentRatingRow>(
    path.join(ELO_DIR, "current_ratings.jsonl"),
  );
  const ratingHistory = await readJsonLines<RatingHistoryRow>(
    path.join(ELO_DIR, "rating_history.jsonl"),
  );

  const playerById = new Map(activePlayers.map((player) => [player.id, player]));
  const playerUpdates = currentRatings.map((row) => {
    const player = playerById.get(row.player_id);
    if (!player) {
      throw new Error(`Missing active player row for ${row.player_id}`);
    }

    return {
      id: player.id,
      external_atp_id: player.external_atp_id,
      full_name: player.full_name,
      country_code: player.country_code,
      birth_date: player.birth_date,
      handedness: player.handedness,
      height_cm: player.height_cm,
      overall_elo: row.overall_elo,
      clay_elo: row.clay_elo,
      hard_elo: row.hard_elo,
      grass_elo: row.grass_elo,
    };
  });

  await upsertBatches("players", playerUpdates, "id");
  await upsertBatches("player_ratings_history", ratingHistory, "player_id,rating_date");

  console.log(
    JSON.stringify(
      {
        playersUpdated: playerUpdates.length,
        ratingHistoryRows: ratingHistory.length,
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
