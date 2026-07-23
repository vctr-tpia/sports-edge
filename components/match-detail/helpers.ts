import type { MatchDetailViewModel, MatchPredictionViewModel } from "@/src/lib/app-view-models";

export function sentenceCase(value?: string | null) {
  if (!value) {
    return "Unavailable";
  }

  return value
    .split("_")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

export function formatPercent(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "Unavailable";
  }

  return `${Math.round(value * 100)}%`;
}

export function formatMetric(value?: number | null, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "Unavailable";
  }

  return Number.isInteger(value) ? `${value}` : value.toFixed(digits);
}

export function formatSchedule(value?: string | null, fallbackDate?: string | null) {
  if (!value) {
    return fallbackDate ?? "Time unavailable";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallbackDate ?? "Time unavailable";
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

export function formatScheduleLong(value?: string | null, fallbackDate?: string | null) {
  if (!value) {
    return fallbackDate ?? "Time unavailable";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallbackDate ?? "Time unavailable";
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).formatToParts(parsed);

  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${lookup.weekday}, ${lookup.month} ${lookup.day} · ${lookup.hour}:${lookup.minute} ${lookup.dayPeriod?.toUpperCase() ?? ""} UTC`
    .replace(/\s+/g, " ")
    .trim();
}

export function playerInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export function playerSurname(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.at(-1) ?? name;
}

export function underdogProbability(match: MatchPredictionViewModel) {
  if (
    typeof match.playerAProbability !== "number" ||
    typeof match.playerBProbability !== "number" ||
    !match.favoredPlayerId
  ) {
    return null;
  }

  return match.favoredPlayerId === match.playerA.id ? match.playerBProbability : match.playerAProbability;
}

export function resultState(detail: MatchDetailViewModel) {
  if (detail.kind !== "historical" || !detail.match.actualWinnerId) {
    return null;
  }

  const winnerId = detail.match.actualWinnerId;
  const winnerName =
    winnerId === detail.match.playerA.id
      ? detail.match.playerA.name
      : winnerId === detail.match.playerB.id
        ? detail.match.playerB.name
        : detail.actualWinnerName ?? "Winner unavailable";
  const predictionCorrect = detail.match.favoredPlayerId === winnerId;

  return {
    winnerName,
    predictionCorrect,
    label: predictionCorrect ? "Model pick correct" : "Model pick missed",
  };
}

export function deterministicCommentary(detail: MatchDetailViewModel) {
  const strongestSignal = detail.supportingFactors[0] ?? detail.factors[0] ?? null;
  const strongestCounter = detail.counterFactors[0] ?? null;
  const confidence = detail.match.confidenceLabel ? sentenceCase(detail.match.confidenceLabel) : "Unrated";
  const supportCount = detail.factorAgreement.favoredPlayerCount;
  const totalSignals = detail.factors.length;

  const opening = strongestSignal
    ? `Sports Edge favors ${detail.favoredPlayerName} because ${strongestSignal.label.toLowerCase()} is the clearest signal in the current pre-match snapshot.`
    : `Sports Edge favors ${detail.favoredPlayerName} based on the current pre-match feature snapshot.`;

  const counter = strongestCounter
    ? `${strongestCounter.label} is the strongest counter-signal and still leans toward ${strongestCounter.favoredPlayerName}.`
    : `No opposing factor currently outweighs the model's leading signals.`;

  const confidenceLine = `${confidence} confidence reflects both the probability gap and the fact that ${supportCount} of ${totalSignals} tracked factors support ${detail.favoredPlayerName}.`;

  return {
    opening,
    counter,
    confidenceLine,
  };
}

function factorDifference(factor: MatchDetailViewModel["factors"][number]) {
  return Math.abs(factor.playerAValue - factor.playerBValue);
}

export function factorStrengthSummary(factor: MatchDetailViewModel["factors"][number]) {
  if (!factor.favoredPlayerName || factor.strength === "neutral") {
    return "Neutral signal";
  }

  return `${sentenceCase(factor.strength)} ${playerSurname(factor.favoredPlayerName)} advantage`;
}

export function formatFactorDelta(detail: MatchDetailViewModel, factor: MatchDetailViewModel["factors"][number]) {
  const sign =
    factor.favoredPlayerId && factor.favoredPlayerId !== detail.match.favoredPlayerId ? "-" : "+";
  const difference = factorDifference(factor);
  const lowerLabel = factor.label.toLowerCase();
  const formatAmount = (value: number, digits = value < 10 ? 1 : 0) =>
    Number.isInteger(value) ? `${Math.round(value)}` : value.toFixed(digits);

  if (lowerLabel.includes("rest")) {
    const days = Math.round(difference);
    return `${sign}${days} day${days === 1 ? "" : "s"}`;
  }

  if (lowerLabel.includes("elo")) {
    return `${sign}${Math.round(difference)}`;
  }

  if (lowerLabel.includes("rate") || lowerLabel.includes("percentage")) {
    const amount = difference <= 1 ? difference * 100 : difference;
    return `${sign}${formatAmount(amount)}%`;
  }

  if (lowerLabel.includes("form")) {
    const amount = difference <= 1 ? difference * 100 : difference;
    return `${sign}${formatAmount(amount)}`;
  }

  if (lowerLabel.includes("quality")) {
    return `${sign}${formatAmount(difference)}`;
  }

  if (difference < 1) {
    return `${sign}${formatAmount(difference * 100)}%`;
  }

  return `${sign}${formatAmount(difference)}`;
}

export function parseComparisonValue(label: string, value: string) {
  if (!value || value === "Unavailable") {
    return null;
  }

  const normalized = value.replace(/,/g, "").trim();
  const pairMatch = normalized.match(/^(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)$/);

  if (pairMatch) {
    const left = Number(pairMatch[1]);
    const right = Number(pairMatch[2]);

    if (label.toLowerCase().includes("ranking")) {
      return left > 0 ? 1 / left : null;
    }

    return left + right > 0 ? left / (left + right) : null;
  }

  if (normalized.endsWith("%")) {
    const parsed = Number(normalized.replace("%", ""));
    return Number.isFinite(parsed) ? parsed : null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  if (label.toLowerCase().includes("ranking")) {
    return parsed > 0 ? 1 / parsed : null;
  }

  return parsed;
}
