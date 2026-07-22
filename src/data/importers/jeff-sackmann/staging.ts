import path from "node:path";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import {
  parseSackmannCsvFile,
  parseSackmannPlayersFile,
  parseSackmannRankingsFile,
} from "./parser";
import type {
  SackmannMatchRow,
  SackmannPlayerRow,
  SackmannRankingRow,
  SackmannStagingSummary,
} from "./types";

export const DEFAULT_SACKMANN_DATA_DIR = path.join(
  process.cwd(),
  "data",
  "jeff-sackmann",
  "atp",
);

export const DEFAULT_STAGING_OUTPUT_DIR = path.join(
  process.cwd(),
  "work",
  "staging",
  "jeff-sackmann",
);

type StagedPlayerRecord = {
  source_player_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  handedness: string | null;
  birth_date: string | null;
  country_code: string | null;
  height_cm: number | null;
  wikidata_id: string | null;
  source_file: string;
};

type StagedRankingRecord = {
  ranking_date: string;
  rank: number;
  source_player_id: string;
  ranking_points: number | null;
  source_file: string;
};

type StagedMatchRecord = {
  external_match_id: string;
  external_tournament_id: string;
  tournament_name: string;
  surface: string | null;
  draw_size: number | null;
  tournament_level_code: string;
  tournament_date: string | null;
  match_num: number | null;
  winner_player_id: string;
  loser_player_id: string;
  winner_name: string;
  loser_name: string;
  score: string | null;
  best_of: number | null;
  round_code: string;
  minutes: number | null;
  winner_rank: number | null;
  winner_rank_points: number | null;
  loser_rank: number | null;
  loser_rank_points: number | null;
  raw_row: SackmannMatchRow;
  source_file: string;
};

function toInt(value: string): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeBirthDate(value: string): string | null {
  if (!value || value.length !== 8) {
    return null;
  }

  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function normalizeTournamentDate(value: string): string | null {
  return normalizeBirthDate(value);
}

function normalizeHandedness(value: string): string | null {
  if (value === "R") {
    return "right";
  }

  if (value === "L") {
    return "left";
  }

  return null;
}

function fullNameFromPlayer(row: SackmannPlayerRow) {
  return `${row.name_first} ${row.name_last}`.trim();
}

function createExternalMatchId(row: SackmannMatchRow) {
  return `${row.tourney_id}-${row.match_num}`;
}

function toJsonLines<T>(rows: T[]) {
  return rows.map((row) => JSON.stringify(row)).join("\n");
}

async function writeJsonLinesFile<T>(filePath: string, rows: T[]) {
  const content = rows.length === 0 ? "" : `${toJsonLines(rows)}\n`;
  await writeFile(filePath, content, "utf8");
}

function stagePlayer(row: SackmannPlayerRow, sourceFile: string): StagedPlayerRecord {
  return {
    source_player_id: row.player_id,
    first_name: row.name_first,
    last_name: row.name_last,
    full_name: fullNameFromPlayer(row),
    handedness: normalizeHandedness(row.hand),
    birth_date: normalizeBirthDate(row.dob),
    country_code: row.ioc || null,
    height_cm: toInt(row.height),
    wikidata_id: row.wikidata_id || null,
    source_file: sourceFile,
  };
}

function stageRanking(row: SackmannRankingRow, sourceFile: string): StagedRankingRecord | null {
  const rank = toInt(row.rank);

  if (rank === null || !row.player) {
    return null;
  }

  return {
    ranking_date: normalizeBirthDate(row.ranking_date) ?? row.ranking_date,
    rank,
    source_player_id: row.player,
    ranking_points: toInt(row.points),
    source_file: sourceFile,
  };
}

function stageMatch(row: SackmannMatchRow, sourceFile: string): StagedMatchRecord | null {
  if (!row.winner_id || !row.loser_id || !row.tourney_id || !row.match_num) {
    return null;
  }

  return {
    external_match_id: createExternalMatchId(row),
    external_tournament_id: row.tourney_id,
    tournament_name: row.tourney_name,
    surface: row.surface ? row.surface.toLowerCase() : null,
    draw_size: toInt(row.draw_size),
    tournament_level_code: row.tourney_level,
    tournament_date: normalizeTournamentDate(row.tourney_date),
    match_num: toInt(row.match_num),
    winner_player_id: row.winner_id,
    loser_player_id: row.loser_id,
    winner_name: row.winner_name,
    loser_name: row.loser_name,
    score: row.score || null,
    best_of: toInt(row.best_of),
    round_code: row.round,
    minutes: toInt(row.minutes),
    winner_rank: toInt(row.winner_rank),
    winner_rank_points: toInt(row.winner_rank_points),
    loser_rank: toInt(row.loser_rank),
    loser_rank_points: toInt(row.loser_rank_points),
    raw_row: row,
    source_file: sourceFile,
  };
}

export async function prepareSackmannStagingData(
  dataDir = DEFAULT_SACKMANN_DATA_DIR,
  outputDir = DEFAULT_STAGING_OUTPUT_DIR,
): Promise<SackmannStagingSummary> {
  await mkdir(outputDir, { recursive: true });
  await rm(path.join(outputDir, "players.jsonl"), { force: true });
  await rm(path.join(outputDir, "rankings.jsonl"), { force: true });
  await rm(path.join(outputDir, "matches_main_draw.jsonl"), { force: true });
  await rm(path.join(outputDir, "summary.json"), { force: true });

  const fileNames = (await readdir(dataDir)).sort();
  const playerFile = "atp_players.csv";
  const rankingFiles = fileNames.filter((file) => file.startsWith("atp_rankings_") && file.endsWith(".csv"));
  const matchFiles = fileNames.filter((file) => /^atp_matches_\d{4}\.csv$/.test(file));

  const players = (await parseSackmannPlayersFile(path.join(dataDir, playerFile))).map((row) =>
    stagePlayer(row, playerFile),
  );

  const rankingResults = await Promise.all(
    rankingFiles.map(async (fileName) => {
      const rows = await parseSackmannRankingsFile(path.join(dataDir, fileName));
      return rows
        .map((row) => stageRanking(row, fileName))
        .filter((row): row is StagedRankingRecord => row !== null);
    }),
  );
  const rankings = rankingResults.flat();

  const matchResults = await Promise.all(
    matchFiles.map(async (fileName) => {
      const rows = await parseSackmannCsvFile(path.join(dataDir, fileName));
      return rows
        .map((row) => stageMatch(row, fileName))
        .filter((row): row is StagedMatchRecord => row !== null);
    }),
  );
  const matches = matchResults.flat();

  const summary: SackmannStagingSummary = {
    playerCount: players.length,
    rankingCount: rankings.length,
    matchCount: matches.length,
    matchFiles: matchFiles.length,
    dateGenerated: new Date().toISOString(),
  };

  await writeJsonLinesFile(path.join(outputDir, "players.jsonl"), players);
  await writeJsonLinesFile(path.join(outputDir, "rankings.jsonl"), rankings);
  await writeJsonLinesFile(path.join(outputDir, "matches_main_draw.jsonl"), matches);
  await writeFile(path.join(outputDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  return summary;
}
