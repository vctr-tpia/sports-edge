import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Surface, TournamentLevel } from "../domain/shared";

const ACTIVE_DIR = path.join(process.cwd(), "work", "normalized", "active-atp");
const OUTPUT_DIR = path.join(process.cwd(), "work", "ratings", "elo-backfill");
const INITIAL_ELO = 1500;
const RECENT_FORM_WINDOW = 10;

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

type EloPlayerState = {
  playerId: string;
  overallElo: number;
  surfaceElos: Record<Surface, number>;
  recentResults: number[];
  matchesPlayed: number;
  lastMatchDate: string | null;
};

type EloRatingSnapshot = {
  player_id: string;
  rating_date: string;
  overall_elo: number;
  clay_elo: number;
  hard_elo: number;
  grass_elo: number;
  recent_form_index: number;
};

type EloCurrentRating = {
  player_id: string;
  overall_elo: number;
  clay_elo: number;
  hard_elo: number;
  grass_elo: number;
  recent_form_index: number;
  matches_played: number;
  last_match_date: string | null;
};

type EloSummary = {
  playerCount: number;
  tournamentCount: number;
  matchCount: number;
  snapshotCount: number;
  latestRatingCount: number;
  dateRange: {
    from: string | null;
    to: string | null;
  };
};

function roundRating(value: number) {
  return Number.parseFloat(value.toFixed(2));
}

function expectedScore(playerElo: number, opponentElo: number) {
  return 1 / (1 + 10 ** ((opponentElo - playerElo) / 400));
}

function levelKFactor(level: TournamentLevel) {
  switch (level) {
    case "grand_slam":
      return 36;
    case "masters":
      return 32;
    case "finals":
    case "olympics":
      return 30;
    case "team_event":
      return 28;
    case "tour":
      return 28;
    case "atp_500":
      return 28;
    case "atp_250":
      return 24;
    case "challenger":
      return 20;
    default:
      return 28;
  }
}

function createInitialState(playerId: string): EloPlayerState {
  return {
    playerId,
    overallElo: INITIAL_ELO,
    surfaceElos: {
      clay: INITIAL_ELO,
      hard: INITIAL_ELO,
      grass: INITIAL_ELO,
    },
    recentResults: [],
    matchesPlayed: 0,
    lastMatchDate: null,
  };
}

function recentFormIndex(results: number[]) {
  if (results.length === 0) {
    return 50;
  }

  const weighted = results.reduce(
    (accumulator, result, index) => {
      const weight = index + 1;
      return {
        wins: accumulator.wins + result * weight,
        total: accumulator.total + weight,
      };
    },
    { wins: 0, total: 0 },
  );

  return Number.parseFloat(((weighted.wins / weighted.total) * 100).toFixed(3));
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

function updateRecentResults(state: EloPlayerState, result: 0 | 1) {
  state.recentResults.push(result);
  if (state.recentResults.length > RECENT_FORM_WINDOW) {
    state.recentResults.shift();
  }
}

function getOrCreateState(states: Map<string, EloPlayerState>, playerId: string) {
  const existing = states.get(playerId);
  if (existing) {
    return existing;
  }

  const created = createInitialState(playerId);
  states.set(playerId, created);
  return created;
}

function applyMatchToStates(
  winner: EloPlayerState,
  loser: EloPlayerState,
  match: NormalizedMatch,
  tournament: NormalizedTournament,
) {
  const k = levelKFactor(tournament.level);

  const winnerExpectedOverall = expectedScore(winner.overallElo, loser.overallElo);
  const loserExpectedOverall = expectedScore(loser.overallElo, winner.overallElo);

  winner.overallElo = roundRating(winner.overallElo + k * (1 - winnerExpectedOverall));
  loser.overallElo = roundRating(loser.overallElo + k * (0 - loserExpectedOverall));

  const winnerSurfaceElo = winner.surfaceElos[match.surface];
  const loserSurfaceElo = loser.surfaceElos[match.surface];
  const winnerExpectedSurface = expectedScore(winnerSurfaceElo, loserSurfaceElo);
  const loserExpectedSurface = expectedScore(loserSurfaceElo, winnerSurfaceElo);

  winner.surfaceElos[match.surface] = roundRating(
    winnerSurfaceElo + k * (1 - winnerExpectedSurface),
  );
  loser.surfaceElos[match.surface] = roundRating(
    loserSurfaceElo + k * (0 - loserExpectedSurface),
  );

  winner.matchesPlayed += 1;
  loser.matchesPlayed += 1;
  winner.lastMatchDate = match.match_date;
  loser.lastMatchDate = match.match_date;
  updateRecentResults(winner, 1);
  updateRecentResults(loser, 0);
}

function snapshotFromState(state: EloPlayerState, ratingDate: string): EloRatingSnapshot {
  return {
    player_id: state.playerId,
    rating_date: ratingDate,
    overall_elo: roundRating(state.overallElo),
    clay_elo: roundRating(state.surfaceElos.clay),
    hard_elo: roundRating(state.surfaceElos.hard),
    grass_elo: roundRating(state.surfaceElos.grass),
    recent_form_index: recentFormIndex(state.recentResults),
  };
}

function currentFromState(state: EloPlayerState): EloCurrentRating {
  return {
    player_id: state.playerId,
    overall_elo: roundRating(state.overallElo),
    clay_elo: roundRating(state.surfaceElos.clay),
    hard_elo: roundRating(state.surfaceElos.hard),
    grass_elo: roundRating(state.surfaceElos.grass),
    recent_form_index: recentFormIndex(state.recentResults),
    matches_played: state.matchesPlayed,
    last_match_date: state.lastMatchDate,
  };
}

export async function computeEloBackfill() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  for (const fileName of ["rating_history.jsonl", "current_ratings.jsonl", "summary.json"]) {
    await rm(path.join(OUTPUT_DIR, fileName), { force: true });
  }

  const players = await readJsonLines<NormalizedPlayer>(path.join(ACTIVE_DIR, "players.jsonl"));
  const tournaments = await readJsonLines<NormalizedTournament>(
    path.join(ACTIVE_DIR, "tournaments.jsonl"),
  );
  const matches = await readJsonLines<NormalizedMatch>(path.join(ACTIVE_DIR, "matches.jsonl"));

  const tournamentById = new Map(tournaments.map((tournament) => [tournament.id, tournament]));
  const states = new Map<string, EloPlayerState>();
  for (const player of players) {
    states.set(player.id, createInitialState(player.id));
  }

  const sortedMatches = [...matches].sort((left, right) => {
    const byDate = left.match_date.localeCompare(right.match_date);
    if (byDate !== 0) {
      return byDate;
    }

    return left.external_match_id.localeCompare(right.external_match_id);
  });

  const snapshots: EloRatingSnapshot[] = [];
  let currentDate: string | null = null;
  const touchedPlayers = new Set<string>();

  function flushSnapshotsForDate() {
    if (!currentDate || touchedPlayers.size === 0) {
      return;
    }

    for (const playerId of touchedPlayers) {
      const state = states.get(playerId);
      if (!state) {
        continue;
      }

      snapshots.push(snapshotFromState(state, currentDate));
    }

    touchedPlayers.clear();
  }

  for (const match of sortedMatches) {
    if (currentDate !== match.match_date) {
      flushSnapshotsForDate();
      currentDate = match.match_date;
    }

    const tournament = tournamentById.get(match.tournament_id);
    if (!tournament) {
      continue;
    }

    const winnerState = getOrCreateState(states, match.winner_id);
    const loserState = getOrCreateState(states, match.loser_id);
    applyMatchToStates(winnerState, loserState, match, tournament);
    touchedPlayers.add(match.winner_id);
    touchedPlayers.add(match.loser_id);
  }

  flushSnapshotsForDate();

  const currentRatings = [...states.values()]
    .filter((state) => state.matchesPlayed > 0)
    .map((state) => currentFromState(state))
    .sort((left, right) => right.overall_elo - left.overall_elo);

  const summary: EloSummary = {
    playerCount: players.length,
    tournamentCount: tournaments.length,
    matchCount: matches.length,
    snapshotCount: snapshots.length,
    latestRatingCount: currentRatings.length,
    dateRange: {
      from: sortedMatches[0]?.match_date ?? null,
      to: sortedMatches.at(-1)?.match_date ?? null,
    },
  };

  await writeJsonLines(path.join(OUTPUT_DIR, "rating_history.jsonl"), snapshots);
  await writeJsonLines(path.join(OUTPUT_DIR, "current_ratings.jsonl"), currentRatings);
  await writeFile(path.join(OUTPUT_DIR, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  return summary;
}
