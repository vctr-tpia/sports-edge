import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Surface, TournamentLevel } from "../../../domain/shared";

export const DEFAULT_STAGING_OUTPUT_DIR = path.join(
  process.cwd(),
  "work",
  "staging",
  "jeff-sackmann",
);

export const DEFAULT_NORMALIZED_OUTPUT_DIR = path.join(
  process.cwd(),
  "work",
  "normalized",
  "active-atp",
);
export const DEFAULT_SACKMANN_SOURCE_DIR = path.join(
  process.cwd(),
  "data",
  "jeff-sackmann",
  "atp",
);

const ACTIVE_WINDOW_YEARS = 10;

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
  raw_row: Record<string, string>;
  source_file: string;
};

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

type NormalizedPlayer = {
  id: string;
  external_atp_id: string;
  full_name: string;
  country_code: string | null;
  birth_date: string | null;
  handedness: "right" | "left" | "unknown";
  height_cm: number | null;
  created_at_source: string;
};

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

type NormalizedMatchEntry = {
  id: string;
  match_id: string;
  player_id: string;
  side: "A" | "B";
  ranking_at_match: number | null;
  ranking_points_at_match: number | null;
};

type NormalizedPlayerMatchStat = {
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

type NormalizationSummary = {
  referenceDate: string;
  cutoffDate: string;
  players: number;
  supplementalRankedPlayers: number;
  tournaments: number;
  matches: number;
  matchEntries: number;
  playerMatchStats: number;
  excludedBeforeCutoff: number;
  excludedUnsupportedSurface: number;
};

function deterministicUuid(prefix: string, source: string) {
  const hash = createHash("sha1").update(`${prefix}:${source}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

function subtractYears(dateString: string, years: number) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCFullYear(date.getUTCFullYear() - years);
  return date.toISOString().slice(0, 10);
}

function getActiveReferenceDate() {
  return new Date().toISOString().slice(0, 10);
}

function mapSurface(value: string | null): Surface | null {
  if (value === "clay" || value === "hard" || value === "grass") {
    return value;
  }

  return null;
}

function mapTournamentLevel(code: string): TournamentLevel | null {
  switch (code) {
    case "G":
      return "grand_slam";
    case "M":
      return "masters";
    case "A":
      return "tour";
    case "F":
      return "finals";
    case "D":
      return "team_event";
    case "O":
      return "olympics";
    case "C":
      return "challenger";
    default:
      return null;
  }
}

function normalizeHandedness(value: string | null): "right" | "left" | "unknown" {
  if (value === "right" || value === "left") {
    return value;
  }

  return "unknown";
}

function roundStat(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return null;
  }

  return Number.parseFloat(value.toFixed(2));
}

function pct(numerator: number | null, denominator: number | null) {
  if (numerator === null || denominator === null || denominator <= 0) {
    return null;
  }

  return roundStat((numerator / denominator) * 100);
}

function toInt(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

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

async function readCurrentRankedPlayerIds(sourceDir: string) {
  const content = await readFile(path.join(sourceDir, "atp_rankings_current.csv"), "utf8");
  const lines = content.split("\n").filter(Boolean);
  const rows = lines.slice(1);
  const rankedPlayerIds = new Set<string>();

  for (const row of rows) {
    const [, , playerId] = row.split(",");
    if (playerId) {
      rankedPlayerIds.add(playerId);
    }
  }

  return rankedPlayerIds;
}

function buildPlayerStats(
  matchId: string,
  playerId: string,
  row: Record<string, string>,
  side: "winner" | "loser",
): NormalizedPlayerMatchStat {
  const prefix = side === "winner" ? "w_" : "l_";
  const oppPrefix = side === "winner" ? "l_" : "w_";
  const servicePoints = toInt(row[`${prefix}svpt`]);
  const firstIn = toInt(row[`${prefix}1stIn`]);
  const firstWon = toInt(row[`${prefix}1stWon`]);
  const secondWon = toInt(row[`${prefix}2ndWon`]);
  const breakSaved = toInt(row[`${prefix}bpSaved`]);
  const breakFaced = toInt(row[`${prefix}bpFaced`]);
  const oppBreakSaved = toInt(row[`${oppPrefix}bpSaved`]);
  const oppBreakFaced = toInt(row[`${oppPrefix}bpFaced`]);
  const oppServicePoints = toInt(row[`${oppPrefix}svpt`]);
  const oppFirstWon = toInt(row[`${oppPrefix}1stWon`]);
  const oppSecondWon = toInt(row[`${oppPrefix}2ndWon`]);
  const secondServePoints = servicePoints !== null && firstIn !== null ? servicePoints - firstIn : null;
  const breakConverted =
    oppBreakFaced !== null && oppBreakSaved !== null ? oppBreakFaced - oppBreakSaved : null;
  const returnPointsWon =
    oppServicePoints !== null && oppFirstWon !== null && oppSecondWon !== null
      ? oppServicePoints - oppFirstWon - oppSecondWon
      : null;

  return {
    id: deterministicUuid("player-match-stat", `${matchId}:${playerId}`),
    match_id: matchId,
    player_id: playerId,
    aces: toInt(row[`${prefix}ace`]),
    double_faults: toInt(row[`${prefix}df`]),
    first_serve_in_pct: pct(firstIn, servicePoints),
    first_serve_points_won_pct: pct(firstWon, firstIn),
    second_serve_points_won_pct: pct(secondWon, secondServePoints),
    break_points_saved_pct: pct(breakSaved, breakFaced),
    break_points_converted_pct: pct(breakConverted, oppBreakFaced),
    service_points_won_pct:
      servicePoints !== null && firstWon !== null && secondWon !== null
        ? pct(firstWon + secondWon, servicePoints)
        : null,
    return_points_won_pct: pct(returnPointsWon, oppServicePoints),
  };
}

export async function prepareActiveHistoryNormalization(
  stagingDir = DEFAULT_STAGING_OUTPUT_DIR,
  outputDir = DEFAULT_NORMALIZED_OUTPUT_DIR,
  sourceDir = DEFAULT_SACKMANN_SOURCE_DIR,
): Promise<NormalizationSummary> {
  const activeReferenceDate = getActiveReferenceDate();

  await mkdir(outputDir, { recursive: true });
  for (const name of [
    "players.jsonl",
    "tournaments.jsonl",
    "matches.jsonl",
    "match_entries.jsonl",
    "player_match_stats.jsonl",
    "summary.json",
  ]) {
    await rm(path.join(outputDir, name), { force: true });
  }

  const cutoffDate = subtractYears(activeReferenceDate, ACTIVE_WINDOW_YEARS);
  const [stagedPlayers, stagedMatches, rankedPlayerIds] = await Promise.all([
    readJsonLines<StagedPlayerRecord>(path.join(stagingDir, "players.jsonl")),
    readJsonLines<StagedMatchRecord>(path.join(stagingDir, "matches_main_draw.jsonl")),
    readCurrentRankedPlayerIds(sourceDir),
  ]);

  let excludedBeforeCutoff = 0;
  let excludedUnsupportedSurface = 0;

  const recentMatches = stagedMatches.filter((match) => {
    if (!match.tournament_date || match.tournament_date < cutoffDate) {
      excludedBeforeCutoff += 1;
      return false;
    }

    const surface = mapSurface(match.surface);
    if (!surface) {
      excludedUnsupportedSurface += 1;
      return false;
    }

    return true;
  });

  const playerIds = new Set<string>();
  for (const match of recentMatches) {
    playerIds.add(match.winner_player_id);
    playerIds.add(match.loser_player_id);
  }
  const recentMatchPlayerIds = new Set(playerIds);
  for (const playerId of rankedPlayerIds) {
    playerIds.add(playerId);
  }

  const players: NormalizedPlayer[] = stagedPlayers
    .filter((player) => playerIds.has(player.source_player_id))
    .map((player) => ({
      id: deterministicUuid("player", player.source_player_id),
      external_atp_id: player.source_player_id,
      full_name: player.full_name,
      country_code: player.country_code,
      birth_date: player.birth_date,
      handedness: normalizeHandedness(player.handedness),
      height_cm: player.height_cm,
      created_at_source: player.source_file,
    }));

  const tournamentsByExternalId = new Map<string, NormalizedTournament>();
  const matches: NormalizedMatch[] = [];
  const matchEntries: NormalizedMatchEntry[] = [];
  const playerMatchStats: NormalizedPlayerMatchStat[] = [];

  for (const match of recentMatches) {
    const surface = mapSurface(match.surface);
    const level = mapTournamentLevel(match.tournament_level_code);
    if (!surface || !level || !match.tournament_date) {
      continue;
    }

    const tournamentId = deterministicUuid("tournament", match.external_tournament_id);
    if (!tournamentsByExternalId.has(match.external_tournament_id)) {
      tournamentsByExternalId.set(match.external_tournament_id, {
        id: tournamentId,
        external_tournament_id: match.external_tournament_id,
        name: match.tournament_name,
        season: Number.parseInt(match.tournament_date.slice(0, 4), 10),
        surface,
        level,
        source_level_code: match.tournament_level_code,
        start_date: match.tournament_date,
      });
    }

    const winnerId = deterministicUuid("player", match.winner_player_id);
    const loserId = deterministicUuid("player", match.loser_player_id);
    const matchId = deterministicUuid("match", match.external_match_id);

    matches.push({
      id: matchId,
      external_match_id: match.external_match_id,
      tournament_id: tournamentId,
      match_date: match.tournament_date,
      round: match.round_code,
      surface,
      best_of: match.best_of,
      winner_id: winnerId,
      loser_id: loserId,
      score: match.score,
      minutes: match.minutes,
    });

    matchEntries.push({
      id: deterministicUuid("match-entry", `${matchId}:${winnerId}:A`),
      match_id: matchId,
      player_id: winnerId,
      side: "A",
      ranking_at_match: match.winner_rank,
      ranking_points_at_match: match.winner_rank_points,
    });
    matchEntries.push({
      id: deterministicUuid("match-entry", `${matchId}:${loserId}:B`),
      match_id: matchId,
      player_id: loserId,
      side: "B",
      ranking_at_match: match.loser_rank,
      ranking_points_at_match: match.loser_rank_points,
    });

    playerMatchStats.push(buildPlayerStats(matchId, winnerId, match.raw_row, "winner"));
    playerMatchStats.push(buildPlayerStats(matchId, loserId, match.raw_row, "loser"));
  }

  const tournaments = [...tournamentsByExternalId.values()].sort((a, b) =>
    a.start_date && b.start_date ? a.start_date.localeCompare(b.start_date) : 0,
  );

  const summary: NormalizationSummary = {
    referenceDate: activeReferenceDate,
    cutoffDate,
    players: players.length,
    supplementalRankedPlayers: [...rankedPlayerIds].filter(
      (playerId) => !recentMatchPlayerIds.has(playerId),
    ).length,
    tournaments: tournaments.length,
    matches: matches.length,
    matchEntries: matchEntries.length,
    playerMatchStats: playerMatchStats.length,
    excludedBeforeCutoff,
    excludedUnsupportedSurface,
  };

  await writeJsonLines(path.join(outputDir, "players.jsonl"), players);
  await writeJsonLines(path.join(outputDir, "tournaments.jsonl"), tournaments);
  await writeJsonLines(path.join(outputDir, "matches.jsonl"), matches);
  await writeJsonLines(path.join(outputDir, "match_entries.jsonl"), matchEntries);
  await writeJsonLines(path.join(outputDir, "player_match_stats.jsonl"), playerMatchStats);
  await writeFile(path.join(outputDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  return summary;
}
