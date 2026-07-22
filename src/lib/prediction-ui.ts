import type { MatchPrediction } from "@/src/domain/predictions/explanation";

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function formatMetric(value: number) {
  if (Number.isInteger(value)) {
    return String(value);
  }

  if (Math.abs(value) >= 100) {
    return value.toFixed(0);
  }

  return value.toFixed(1);
}

export function formatProjectionMetric(value: number) {
  return value.toFixed(1);
}

export function formatProjectionLine(value: number) {
  const rounded = Math.round(value * 2) / 2;
  return rounded.toFixed(1);
}

export function formatRound(round: string) {
  const labels: Record<string, string> = {
    BR: "Bronze Match",
    RR: "Round Robin",
    R128: "Round of 128",
    R64: "Round of 64",
    R32: "Round of 32",
    R16: "Round of 16",
    QF: "Quarterfinal",
    SF: "Semifinal",
    F: "Final",
  };

  return labels[round] ?? round;
}

export function formatSurface(surface: string) {
  return `${surface[0].toUpperCase()}${surface.slice(1)}`;
}

export function formatMatchDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function formatMatchDateTime(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(parsed);
}

export function formatLocation(city?: string | null, countryCode?: string | null) {
  if (city && countryCode) {
    return `${city}, ${countryCode}`;
  }

  return city ?? countryCode ?? null;
}

export function confidenceLabel(confidence: number) {
  if (confidence >= 0.2) {
    return "High";
  }

  if (confidence >= 0.1) {
    return "Medium";
  }

  return "Low";
}

export function favoriteSummary(
  prediction: MatchPrediction,
  playerAName: string,
  playerBName: string,
) {
  const playerAIsFavorite = prediction.playerAWinProbability >= prediction.playerBWinProbability;
  const favoredName = playerAIsFavorite ? playerAName : playerBName;
  const underdogName = playerAIsFavorite ? playerBName : playerAName;
  const favoriteWinProbability = playerAIsFavorite
    ? prediction.playerAWinProbability
    : prediction.playerBWinProbability;

  return {
    playerAIsFavorite,
    favoredName,
    underdogName,
    favoriteWinProbability,
    favoriteWidth: `${Math.max(12, Math.round(favoriteWinProbability * 100))}%`,
  };
}
