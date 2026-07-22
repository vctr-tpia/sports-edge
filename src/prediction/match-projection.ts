import type { MatchProjection } from "@/src/domain/predictions/explanation";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function bestOf3MatchProbabilityFromSetProbability(setProbability: number) {
  return setProbability ** 2 * (3 - 2 * setProbability);
}

function bestOf5MatchProbabilityFromSetProbability(setProbability: number) {
  return setProbability ** 3 * (10 - 15 * setProbability + 6 * setProbability ** 2);
}

function setProbabilityFromMatchProbability(matchProbability: number, bestOf: number) {
  if (matchProbability <= 0.5) {
    return 0.5;
  }

  let low = 0.5;
  let high = 0.999;

  for (let iteration = 0; iteration < 40; iteration += 1) {
    const midpoint = (low + high) / 2;
    const midpointProbability =
      bestOf === 5
        ? bestOf5MatchProbabilityFromSetProbability(midpoint)
        : bestOf3MatchProbabilityFromSetProbability(midpoint);

    if (midpointProbability < matchProbability) {
      low = midpoint;
    } else {
      high = midpoint;
    }
  }

  return (low + high) / 2;
}

function roundProjection(value: number) {
  return Number.parseFloat(value.toFixed(3));
}

export function projectMatchTotals({
  playerAWinProbability,
  playerBWinProbability,
  bestOf,
  averageSurfaceServicePointsWon,
}: {
  playerAWinProbability: number;
  playerBWinProbability: number;
  bestOf: number;
  averageSurfaceServicePointsWon?: number | null;
}): MatchProjection {
  const favoriteMatchWinProbability = Math.max(playerAWinProbability, playerBWinProbability);
  const favoriteSetWinProbability = setProbabilityFromMatchProbability(
    favoriteMatchWinProbability,
    bestOf,
  );

  const decidingSetProbability =
    bestOf === 5
      ? 6 * favoriteSetWinProbability ** 2 * (1 - favoriteSetWinProbability) ** 2
      : 2 * favoriteSetWinProbability * (1 - favoriteSetWinProbability);
  const favoriteStraightSetsProbability =
    bestOf === 5 ? favoriteSetWinProbability ** 3 : favoriteSetWinProbability ** 2;
  const expectedTotalSets =
    bestOf === 5
      ? 3 * (favoriteSetWinProbability ** 3 + (1 - favoriteSetWinProbability) ** 3) +
        4 *
          (3 * favoriteSetWinProbability ** 3 * (1 - favoriteSetWinProbability) +
            3 * (1 - favoriteSetWinProbability) ** 3 * favoriteSetWinProbability) +
        5 * decidingSetProbability
      : 2 + decidingSetProbability;

  const serveStrengthBoost = clamp(
    ((((averageSurfaceServicePointsWon ?? 62) - 62) / 5) * 0.35),
    -0.35,
    0.55,
  );
  const expectedGamesPerSet = clamp(
    9.2 + decidingSetProbability * 1.15 + serveStrengthBoost,
    8.2,
    11.8,
  );

  return {
    expectedTotalSets: roundProjection(expectedTotalSets),
    expectedTotalGames: roundProjection(expectedTotalSets * expectedGamesPerSet),
    favoriteStraightSetsProbability: roundProjection(favoriteStraightSetsProbability),
    decidingSetProbability: roundProjection(decidingSetProbability),
  };
}
