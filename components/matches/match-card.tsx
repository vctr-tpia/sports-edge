import Link from "next/link";
import type { MatchPredictionViewModel } from "@/src/lib/app-view-models";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/src/lib/cn";

type MatchCardProps = {
  match: MatchPredictionViewModel;
  variant?: "featured" | "row";
};

function sentenceCase(value?: string | null) {
  if (!value) {
    return "Unavailable";
  }

  return value
    .split("_")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function formatSchedule(value?: string | null, fallbackDate?: string) {
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

function formatProbability(value?: number | null) {
  if (typeof value !== "number") {
    return null;
  }

  return `${Math.round(value * 100)}%`;
}

function buildPredictionState(match: MatchPredictionViewModel) {
  if (
    typeof match.playerAProbability !== "number" ||
    typeof match.playerBProbability !== "number" ||
    !match.favoredPlayerId
  ) {
    return null;
  }

  const favoriteIsPlayerA = match.favoredPlayerId === match.playerA.id;
  return {
    favoriteName: favoriteIsPlayerA ? match.playerA.name : match.playerB.name,
    favoriteProbability: favoriteIsPlayerA ? match.playerAProbability : match.playerBProbability,
    underdogProbability: favoriteIsPlayerA ? match.playerBProbability : match.playerAProbability,
    playerAProbability: match.playerAProbability,
    playerBProbability: match.playerBProbability,
  };
}

function buildRowValue(match: MatchPredictionViewModel, prediction: ReturnType<typeof buildPredictionState>) {
  if (prediction) {
    return {
      value: formatProbability(prediction.favoriteProbability),
      tone: "text-[var(--accent-lime)]",
      detail:
        match.confidenceLabel
          ? `Model pick: ${prediction.favoriteName} · ${sentenceCase(match.confidenceLabel)} agreement`
          : `Model pick: ${prediction.favoriteName}`,
    };
  }

  if (match.status === "settled" && match.actualWinnerId && match.favoredPlayerId) {
    const won = match.actualWinnerId === match.favoredPlayerId;
    return {
      value: won ? "W" : "L",
      tone: won ? "text-[var(--accent-lime)]" : "text-danger",
      detail: won ? "Settled · model pick correct" : "Settled · model pick missed",
    };
  }

  if (match.status === "cancelled" || match.status === "walkover" || match.status === "postponed") {
    return {
      value: "—",
      tone: "text-inkMuted",
      detail: `${sentenceCase(match.status)} · prediction unavailable`,
    };
  }

  return {
    value: "—",
    tone: "text-inkMuted",
    detail: "Prediction unavailable",
  };
}

function getPlayerMarker(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

function PlayerLine({
  name,
  ranking,
  countryCode,
  emphasized,
  compact = false,
  alignRight = false,
}: {
  name: string;
  ranking?: number | null;
  countryCode?: string | null;
  emphasized: boolean;
  compact?: boolean;
  alignRight?: boolean;
}) {
  if (compact) {
    return (
      <div className={cn("flex items-center gap-4", alignRight && "justify-end")}>
        {!alignRight ? (
          <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-full bg-[var(--accent-blue)] text-[22px] font-bold text-white">
            {getPlayerMarker(name)}
          </div>
        ) : null}
        <div className={cn("min-w-0", alignRight && "text-right")}>
          <p className="truncate text-[19px] font-semibold leading-[1.08] text-ink sm:text-[20px]">
            {name}
          </p>
          <div className={cn("mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-inkMuted", alignRight && "justify-end")}>
            <span>{ranking ? `Rank #${ranking}` : "Ranking unavailable"}</span>
            {countryCode ? <span className="uppercase">{countryCode}</span> : null}
          </div>
        </div>
        {alignRight ? (
          <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-full bg-[#162334] text-[22px] font-bold text-white">
            {getPlayerMarker(name)}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-[18px] border transition",
        "px-4 py-3",
        emphasized
          ? "border-[color:var(--border-accent)] bg-[rgba(20,122,229,0.1)]"
          : "border-borderSubtle bg-[rgba(255,255,255,0.02)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              compact ? "text-[18px] sm:text-[19px]" : "text-[15px] sm:text-[16px]",
              "font-semibold leading-[1.25]",
              emphasized ? "text-ink" : "text-inkSecondary",
            )}
          >
            {name}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-inkMuted sm:text-[13px]">
            <span>{ranking ? `Rank #${ranking}` : "Ranking unavailable"}</span>
            {countryCode ? <span className="uppercase">{countryCode}</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MatchCard({ match, variant = "row" }: MatchCardProps) {
  const prediction = buildPredictionState(match);
  const isFeatured = variant === "featured";
  const rowValue = buildRowValue(match, prediction);

  if (isFeatured) {
    return (
      <Link href={`/match/${match.matchId}`} className="block focus-visible:outline-none">
        <Card className="group rounded-[28px] border-[color:var(--border-accent)] bg-[var(--featured-surface)] p-6 shadow-card transition duration-200 hover:brightness-[1.03] sm:p-7 lg:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge tone="brand">Featured</Badge>
            {match.confidenceLabel ? (
              <Badge tone="positive">{sentenceCase(match.confidenceLabel)}</Badge>
            ) : null}
          </div>

          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-inkMuted">
            {match.tournamentName}
            {match.round ? ` · ${sentenceCase(match.round)}` : ""}
            {match.surface ? ` · ${sentenceCase(match.surface)}` : ""}
          </p>
          <p className="mt-2 text-[14px] text-inkSecondary">
            {prediction ? `Model favors ${prediction.favoriteName}` : "Prediction unavailable"}
          </p>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
            <div className="min-w-0">
              <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_32px_minmax(0,1fr)] md:items-center">
                <PlayerLine
                  name={match.playerA.name}
                  ranking={match.playerA.ranking}
                  countryCode={match.playerA.countryCode}
                  emphasized={match.favoredPlayerId === match.playerA.id}
                  compact
                />
                <p className="text-center text-[14px] font-medium uppercase tracking-[0.14em] text-inkMuted">
                  vs
                </p>
                <PlayerLine
                  name={match.playerB.name}
                  ranking={match.playerB.ranking}
                  countryCode={match.playerB.countryCode}
                  emphasized={match.favoredPlayerId === match.playerB.id}
                  compact
                  alignRight
                />
              </div>
              <div className="mt-6 h-3 rounded-full bg-[var(--progress-track)]">
                <div
                  className="h-full rounded-full shadow-[0_0_16px_rgba(46,194,255,0.22)]"
                  style={{
                    background: "var(--progress-fill)",
                    width: formatProbability(prediction?.favoriteProbability) ?? "0%",
                  }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-[14px] font-semibold">
                <span className="text-[var(--accent-lime)]">
                  {prediction ? formatProbability(prediction.favoriteProbability) : "—"}
                </span>
                <span className="text-inkSecondary">
                  {prediction ? formatProbability(prediction.underdogProbability) : "—"}
                </span>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-[var(--surface-inset)] px-5 py-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-inkSecondary">
                    Top factor
                  </p>
                  <p className="mt-1 truncate text-[15px] font-semibold text-ink">
                    {match.topFactorLabel ?? formatSchedule(match.scheduledAt, match.matchDate)}
                  </p>
                </div>
                <span className="text-[15px] font-semibold text-[var(--accent-cyan)]">
                  View analysis →
                </span>
              </div>
            </div>

            <div className="text-left lg:text-right">
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-cyan)]">
                Model pick
              </p>
              <p className="numeric text-[56px] font-bold leading-none tracking-[-0.07em] text-[var(--accent-lime)]">
                {prediction ? formatProbability(prediction.favoriteProbability) : "—"}
              </p>
              <p className="mt-2 text-[15px] font-semibold text-[var(--accent-lime)]">
                {prediction ? `${prediction.favoriteName} favored` : "Prediction unavailable"}
              </p>
              <p className="mt-3 text-[13px] text-inkSecondary">
                {match.scheduledAt ? formatSchedule(match.scheduledAt, match.matchDate) : match.matchDate}
              </p>
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/match/${match.matchId}`} className="block focus-visible:outline-none">
      <Card className="group rounded-[24px] p-5 transition duration-200 hover:border-[color:var(--border-accent)] hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.018),rgba(255,255,255,0)),var(--surface-1)] sm:px-5 sm:py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-cyan)]">
              ATP · {match.tournamentName}
              {match.round ? ` · ${sentenceCase(match.round)}` : ""}
              {match.surface ? ` · ${sentenceCase(match.surface)}` : ""}
              {match.scheduledAt ? ` · ${formatSchedule(match.scheduledAt, match.matchDate)}` : ""}
            </p>
            <p className="mt-3 text-[18px] font-semibold leading-[1.3] text-ink sm:text-[20px]">
              {match.playerA.name} <span className="text-inkSecondary">vs</span> {match.playerB.name}
            </p>
            <p className="mt-2 text-[13px] text-inkSecondary">
              {rowValue.detail}
            </p>
          </div>

          <div className="shrink-0 pl-3 text-right">
            <p className={cn("numeric text-[32px] font-bold leading-none tracking-[-0.05em]", rowValue.tone)}>
              {rowValue.value}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
