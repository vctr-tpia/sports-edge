import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { MatchDetailViewModel } from "@/src/lib/app-view-models";
import { cn } from "@/src/lib/cn";
import {
  formatPercent,
  formatScheduleLong,
  formatFactorDelta,
  playerInitials,
  playerSurname,
  resultState,
  sentenceCase,
  underdogProbability,
} from "@/components/match-detail/helpers";

function statusTone(detail: MatchDetailViewModel) {
  if (detail.kind === "historical") {
    const settled = resultState(detail);
    return settled?.predictionCorrect ? "positive" : "warning";
  }

  return detail.match.confidenceLabel === "very_high" ? "positive" : "brand";
}

function statusLabel(detail: MatchDetailViewModel) {
  if (detail.kind === "historical") {
    const settled = resultState(detail);
    return settled?.label ?? "Settled";
  }

  return detail.match.confidenceLabel ? sentenceCase(detail.match.confidenceLabel) : "Prediction ready";
}

function playerMeta(ranking?: number | null, countryCode?: string | null) {
  return [ranking ? `Rank #${ranking}` : "Ranking unavailable", countryCode?.toUpperCase() ?? null]
    .filter(Boolean)
    .join(" · ");
}

function metricLabel(detail: MatchDetailViewModel) {
  if (detail.kind === "historical") {
    const settled = resultState(detail);
    return settled ? settled.label : "Settled";
  }

  return `${detail.factorAgreement.favoredPlayerCount} of ${detail.factors.length} factors agree`;
}

export function MatchDetailHero({ detail }: { detail: MatchDetailViewModel }) {
  const { match } = detail;
  const settled = resultState(detail);
  const strongestSignal = detail.supportingFactors[0] ?? detail.factors[0] ?? null;
  const favoriteProbability = formatPercent(detail.favoriteWinProbability);
  const otherProbability = formatPercent(underdogProbability(match));
  const upcomingStatusLabel = match.confidenceLabel
    ? `${sentenceCase(match.confidenceLabel)} confidence`
    : statusLabel(detail);
  const metadata = [
    match.tournamentName,
    match.round ? sentenceCase(match.round) : null,
    match.surface ? sentenceCase(match.surface) : null,
    match.bestOf ? `Best of ${match.bestOf}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const dateLine = formatScheduleLong(match.scheduledAt, match.matchDate);

  return (
    <Card className="rounded-[28px] border-[color:var(--border-accent)] bg-[var(--featured-surface)] p-5 shadow-card sm:p-7 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Badge tone="brand" className="px-4 py-2 text-[10px] tracking-[0.16em]">
            Model prediction
          </Badge>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-inkMuted">{metadata}</p>
          <p className="text-[14px] text-inkSecondary">{dateLine}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={statusTone(detail)} className="px-4 py-2 text-[10px] tracking-[0.16em]">
            {detail.kind === "historical" ? statusLabel(detail) : upcomingStatusLabel}
          </Badge>
        </div>
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px_minmax(0,1fr)] xl:items-center">
        <div className="flex items-center gap-4 min-[1150px]:gap-5">
          <div className="flex h-[74px] w-[74px] shrink-0 items-center justify-center rounded-full bg-[var(--accent-blue)] text-[22px] font-bold text-white sm:h-[88px] sm:w-[88px] sm:text-[24px]">
            {playerInitials(match.playerA.name)}
          </div>
          <div className="min-w-0">
            <h1 className="text-balance text-[2rem] font-semibold leading-[0.98] tracking-[-0.055em] text-ink sm:text-[2.5rem]">
              {match.playerA.name}
            </h1>
            <p className="mt-2 text-[14px] text-inkSecondary">
              {playerMeta(match.playerA.ranking, match.playerA.countryCode)}
            </p>
          </div>
        </div>

        <div className="space-y-3 xl:-mx-4">
          <div className="relative overflow-hidden rounded-[24px] border border-[color:rgba(45,194,255,0.08)] bg-[rgba(7,24,41,0.78)] px-5 py-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
            <div className="pointer-events-none absolute inset-x-0 top-1/3 border-t border-white/5" />
            <div className="pointer-events-none absolute inset-x-0 top-2/3 border-t border-white/5" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-inkMuted">
              Sports Edge favors
            </p>
            <p className="numeric mt-4 text-[4.5rem] font-bold leading-none tracking-[-0.08em] text-[var(--accent-lime)] sm:text-[5.2rem]">
              {favoriteProbability}
            </p>
            <p className="mt-2 text-[15px] font-semibold uppercase tracking-[0.06em] text-[var(--accent-lime)]">
              {playerSurname(detail.favoredPlayerName)}
            </p>
          </div>

          <div className="rounded-[18px] bg-[rgba(8,22,37,0.88)] px-4 py-3 shadow-[0_16px_26px_rgba(4,12,24,0.22)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-inkMuted">
              {metricLabel(detail)}
            </p>
            <p className="mt-1 text-[14px] font-medium text-ink">
              {strongestSignal
                ? `Strongest signal: ${formatFactorDelta(detail, strongestSignal)} ${strongestSignal.label}`
                : "Strongest signal unavailable"}
            </p>
            <p className="mt-2 text-[12px] text-inkSecondary">
              {match.confidenceLabel ? sentenceCase(match.confidenceLabel) : "Unrated"} confidence
              {" · "}
              {detail.factorAgreement.favoredPlayerCount} of {detail.factors.length} factors agree
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 xl:justify-end">
          <div className="min-w-0 xl:text-right">
            <h2 className="text-balance text-[2rem] font-semibold leading-[0.98] tracking-[-0.055em] text-ink sm:text-[2.5rem]">
              {match.playerB.name}
            </h2>
            <p className="mt-2 text-[14px] text-inkSecondary">
              {playerMeta(match.playerB.ranking, match.playerB.countryCode)}
            </p>
          </div>
          <div className="flex h-[74px] w-[74px] shrink-0 items-center justify-center rounded-full bg-[#162334] text-[22px] font-bold text-white sm:h-[88px] sm:w-[88px] sm:text-[24px]">
            {playerInitials(match.playerB.name)}
          </div>
        </div>
      </div>

      <div className="mt-8 h-2.5 rounded-full bg-[var(--progress-track)]">
        <div
          className="h-full rounded-full shadow-[0_0_16px_rgba(46,194,255,0.22)]"
          style={{
            background: "var(--progress-fill)",
            width: favoriteProbability === "Unavailable" ? "0%" : favoriteProbability,
          }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-[13px] font-semibold">
        <span className="text-[var(--accent-cyan)]">
          {playerSurname(detail.favoredPlayerName)} {favoriteProbability}
        </span>
        <span className="text-inkSecondary">
          {playerSurname(detail.underdogPlayerName)} {otherProbability}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-[var(--surface-inset)] px-5 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-inkMuted">Match state</p>
          <p className={cn("mt-1 text-[15px] font-medium", settled ? (settled.predictionCorrect ? "text-[var(--accent-lime)]" : "text-warning") : "text-ink")}>
            {settled
              ? `${settled.label} · ${settled.winnerName}`
              : match.providerTimeLabel
                ? `Scheduled ${match.providerTimeLabel}`
                : "Upcoming pre-match snapshot"}
          </p>
        </div>

        <div className="text-left sm:text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-inkMuted">Model version</p>
          <p className="mt-1 text-[15px] font-medium text-[var(--accent-cyan)]">
            {match.modelVersion ?? "Unavailable"}
          </p>
        </div>
      </div>
    </Card>
  );
}
