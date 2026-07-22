import type { Surface, TournamentLevel } from "@/src/domain/shared";

export const INITIAL_ELO = 1500;
export const RECENT_WINDOW = 10;

export type PlayerFeatureState = {
  playerId: string;
  overallElo: number;
  surfaceElos: Record<Surface, number>;
  recentResults: number[];
  recentSurfaceResults: Record<Surface, number[]>;
  recentOpponentElos: number[];
  recentSurfaceServicePointsWon: Record<Surface, number[]>;
  recentSurfaceReturnPointsWon: Record<Surface, number[]>;
  lastMatchDate: string | null;
  surfaceRecord: Record<Surface, { wins: number; losses: number }>;
};

export type FeatureTournamentContext = {
  level: TournamentLevel;
};

export type ResolvedMatchResult = {
  match_date: string;
  surface: Surface;
};

export type ResolvedPlayerMatchStats = {
  servicePointsWonPct: number | null;
  returnPointsWonPct: number | null;
};

export function roundRating(value: number) {
  return Number.parseFloat(value.toFixed(2));
}

export function roundMetric(value: number) {
  return Number.parseFloat(value.toFixed(3));
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

export function createInitialState(playerId: string): PlayerFeatureState {
  return {
    playerId,
    overallElo: INITIAL_ELO,
    surfaceElos: {
      clay: INITIAL_ELO,
      hard: INITIAL_ELO,
      grass: INITIAL_ELO,
    },
    recentResults: [],
    recentSurfaceResults: {
      clay: [],
      hard: [],
      grass: [],
    },
    recentOpponentElos: [],
    recentSurfaceServicePointsWon: {
      clay: [],
      hard: [],
      grass: [],
    },
    recentSurfaceReturnPointsWon: {
      clay: [],
      hard: [],
      grass: [],
    },
    lastMatchDate: null,
    surfaceRecord: {
      clay: { wins: 0, losses: 0 },
      hard: { wins: 0, losses: 0 },
      grass: { wins: 0, losses: 0 },
    },
  };
}

export function recentFormIndex(results: number[]) {
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

  return roundMetric((weighted.wins / weighted.total) * 100);
}

export function averageOpponentQuality(opponentElos: number[]) {
  if (opponentElos.length === 0) {
    return INITIAL_ELO;
  }

  const total = opponentElos.reduce((sum, value) => sum + value, 0);
  return roundMetric(total / opponentElos.length);
}

export function surfaceWinRate(state: PlayerFeatureState, surface: Surface) {
  const record = state.surfaceRecord[surface];
  const total = record.wins + record.losses;
  if (total === 0) {
    return 50;
  }

  return roundMetric((record.wins / total) * 100);
}

export function recentSurfaceFormIndex(state: PlayerFeatureState, surface: Surface) {
  return recentFormIndex(state.recentSurfaceResults[surface]);
}

export function recentStatAverage(values: number[], fallback = 50) {
  if (values.length === 0) {
    return fallback;
  }

  const weighted = values.reduce(
    (accumulator, value, index) => {
      const weight = index + 1;
      return {
        total: accumulator.total + value * weight,
        weight: accumulator.weight + weight,
      };
    },
    { total: 0, weight: 0 },
  );

  return roundMetric(weighted.total / weighted.weight);
}

export function recentSurfaceServicePointsWon(state: PlayerFeatureState, surface: Surface) {
  return recentStatAverage(state.recentSurfaceServicePointsWon[surface]);
}

export function recentSurfaceReturnPointsWon(state: PlayerFeatureState, surface: Surface) {
  return recentStatAverage(state.recentSurfaceReturnPointsWon[surface]);
}

export function restDays(lastMatchDate: string | null, matchDate: string) {
  if (!lastMatchDate) {
    return null;
  }

  const last = new Date(`${lastMatchDate}T00:00:00Z`);
  const current = new Date(`${matchDate}T00:00:00Z`);
  const diff = current.getTime() - last.getTime();
  return Math.max(0, Math.round(diff / 86400000) - 1);
}

export function pairKey(playerA: string, playerB: string) {
  return [playerA, playerB].sort().join(":");
}

export function roundOrder(round: string) {
  const order: Record<string, number> = {
    BR: 0,
    RR: 1,
    R128: 2,
    R64: 3,
    R32: 4,
    R16: 5,
    QF: 6,
    SF: 7,
    F: 8,
  };

  return order[round] ?? 99;
}

function pushBounded(list: number[], value: number) {
  list.push(value);
  if (list.length > RECENT_WINDOW) {
    list.shift();
  }
}

export function applyMatchResult(
  winner: PlayerFeatureState,
  loser: PlayerFeatureState,
  match: ResolvedMatchResult,
  tournament: FeatureTournamentContext,
  winnerStats?: ResolvedPlayerMatchStats,
  loserStats?: ResolvedPlayerMatchStats,
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

  pushBounded(winner.recentResults, 1);
  pushBounded(loser.recentResults, 0);
  pushBounded(winner.recentSurfaceResults[match.surface], 1);
  pushBounded(loser.recentSurfaceResults[match.surface], 0);
  pushBounded(winner.recentOpponentElos, loser.overallElo);
  pushBounded(loser.recentOpponentElos, winner.overallElo);

  if (winnerStats?.servicePointsWonPct !== null && winnerStats?.servicePointsWonPct !== undefined) {
    pushBounded(
      winner.recentSurfaceServicePointsWon[match.surface],
      winnerStats.servicePointsWonPct,
    );
  }

  if (winnerStats?.returnPointsWonPct !== null && winnerStats?.returnPointsWonPct !== undefined) {
    pushBounded(
      winner.recentSurfaceReturnPointsWon[match.surface],
      winnerStats.returnPointsWonPct,
    );
  }

  if (loserStats?.servicePointsWonPct !== null && loserStats?.servicePointsWonPct !== undefined) {
    pushBounded(loser.recentSurfaceServicePointsWon[match.surface], loserStats.servicePointsWonPct);
  }

  if (loserStats?.returnPointsWonPct !== null && loserStats?.returnPointsWonPct !== undefined) {
    pushBounded(loser.recentSurfaceReturnPointsWon[match.surface], loserStats.returnPointsWonPct);
  }

  winner.surfaceRecord[match.surface].wins += 1;
  loser.surfaceRecord[match.surface].losses += 1;
  winner.lastMatchDate = match.match_date;
  loser.lastMatchDate = match.match_date;
}

export function getOrCreateState(states: Map<string, PlayerFeatureState>, playerId: string) {
  const existing = states.get(playerId);
  if (existing) {
    return existing;
  }

  const created = createInitialState(playerId);
  states.set(playerId, created);
  return created;
}
