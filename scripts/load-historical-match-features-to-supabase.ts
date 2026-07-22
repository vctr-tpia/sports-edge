import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdminClient } from "../src/lib/supabase-admin";

const FEATURES_DIR = path.join(process.cwd(), "work", "features", "atp-match-features");
const BATCH_SIZE = 500;

type MatchFeatureRow = {
  match_id: string;
  feature_version: string;
  match_date: string;
  tournament_id: string;
  tournament_level: string;
  surface: string;
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
  const rows = await readJsonLines<MatchFeatureRow>(
    path.join(FEATURES_DIR, "historical_match_features.jsonl"),
  );

  await upsertBatches("match_feature_snapshots", rows, "match_id");

  console.log(
    JSON.stringify(
      {
        featureRowsLoaded: rows.length,
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
