import Link from "next/link";
import { ConfidenceBadge } from "@/components/predictions/confidence-badge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type {
  ModelEdgeViewModel,
  PredictionLedgerEntryViewModel,
  PredictionsPageViewModel,
  RankedPredictionViewModel,
  TopSignalViewModel,
  YesterdayPerformanceViewModel,
} from "@/src/lib/app-view-models";
import { cn } from "@/src/lib/cn";

function formatPercent(value: number, digits = 0) {
  return `${(value * 100).toFixed(digits)}%`;
}

function formatConfidenceScore(value: number) {
  return `${Math.round(value * 100)}%`;
}

function sentenceCase(value?: string | null) {
  if (!value) {
    return "Unavailable";
  }

  return value
    .split("_")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function rankLabel(index: number) {
  return `${index + 1}`.padStart(2, "0");
}

function favoriteName(entry: RankedPredictionViewModel) {
  return entry.favoriteName;
}

function formatLedgerDate(value: string, scheduledAt?: string | null) {
  const target = scheduledAt ?? value;
  const parsed = new Date(target);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function ledgerStatusTone(status: PredictionLedgerEntryViewModel["status"]) {
  switch (status) {
    case "correct":
      return "positive" as const;
    case "incorrect":
      return "warning" as const;
    case "void":
      return "neutral" as const;
    default:
      return "brand" as const;
  }
}

function strongestSignalLabel(signal?: TopSignalViewModel | null) {
  if (!signal) {
    return "Model signal mix remains unavailable.";
  }

  const label = signal.factor.label.toLowerCase();
  if (label.includes("surface")) {
    return "Surface signals lead today’s strongest reads.";
  }
  if (label.includes("elo")) {
    return "Rating gaps are driving today’s clearest picks.";
  }
  if (label.includes("form")) {
    return "Recent-form trends are shaping the current slate.";
  }

  return "Model signals are aligned around a small set of decisive factors.";
}

function primaryCommentaryParagraph(
  commentary: PredictionsPageViewModel["commentary"],
  hero: PredictionsPageViewModel["hero"],
) {
  return `${commentary.stableNote} ${commentary.cautionNote} ${hero.healthMessage ?? commentary.dataNote}`;
}

function recommendationLine(entry: RankedPredictionViewModel) {
  const factorLabel = entry.topFactor?.label ?? "Primary factor unavailable";
  const factorHint = entry.topFactor
    ? `${factorLabel} · ${entry.factorAgreement.favoredPlayerCount} of ${entry.factors.length} factors agree`
    : `${entry.factorAgreement.favoredPlayerCount} of ${entry.factors.length} factors agree`;

  return factorHint;
}

function strongestPick(recommendations: RankedPredictionViewModel[]) {
  return recommendations[0] ?? null;
}

function clearestAdvantage(
  recommendations: RankedPredictionViewModel[],
  edges: ModelEdgeViewModel[],
) {
  if (edges[0]) {
    const linked = recommendations.find((entry) => entry.match.matchId === edges[0].matchId);
    if (linked) {
      return linked;
    }
  }

  return (
    [...recommendations].sort(
      (left, right) => (right.topFactor?.edgeMagnitude ?? 0) - (left.topFactor?.edgeMagnitude ?? 0),
    )[0] ?? null
  );
}

function matchToWatch(recommendations: RankedPredictionViewModel[]) {
  return (
    recommendations.find(
      (entry) =>
        entry.favoriteProbability <= 0.66 &&
        entry.favoriteProbability >= 0.56 &&
        entry.counterFactors.length > 0,
    ) ??
    recommendations.find((entry) => entry.counterFactors.length > 0) ??
    recommendations[1] ??
    recommendations[0] ??
    null
  );
}

function topSignalCards(
  recommendations: RankedPredictionViewModel[],
  edges: ModelEdgeViewModel[],
) {
  const strongest = strongestPick(recommendations);
  const clearest = clearestAdvantage(recommendations, edges);
  const watch = matchToWatch(recommendations);

  return [
    strongest
      ? {
          id: "strongest",
          eyebrow: "Strongest pick",
          eyebrowTone: "brand" as const,
          title: `${strongest.match.playerA.name} vs ${strongest.match.playerB.name}`,
          favorite: favoriteName(strongest),
          value: formatPercent(strongest.favoriteProbability),
          valueTone: "text-[var(--accent-cyan)]",
          detail: recommendationLine(strongest),
        }
      : null,
    clearest
      ? {
          id: "clearest",
          eyebrow: "Clearest advantage",
          eyebrowTone: "positive" as const,
          title: `${clearest.match.playerA.name} vs ${clearest.match.playerB.name}`,
          favorite: favoriteName(clearest),
          value: formatPercent(clearest.favoriteProbability),
          valueTone: "text-[var(--accent-lime)]",
          detail:
            clearest.topFactor?.summary ?? "Largest internal rating gap across the current slate.",
        }
      : null,
    watch
      ? {
          id: "watch",
          eyebrow: "Match to watch",
          eyebrowTone: "warning" as const,
          title: `${watch.match.playerA.name} vs ${watch.match.playerB.name}`,
          favorite: favoriteName(watch),
          value: formatPercent(watch.favoriteProbability),
          valueTone: "text-warning",
          detail:
            watch.topCounterFactor?.summary ??
            "Supporting and opposing signals remain closely split in this matchup.",
        }
      : null,
  ].filter(
    (
      value,
    ): value is {
      id: string;
      eyebrow: string;
      eyebrowTone: "brand" | "positive" | "warning";
      title: string;
      favorite: string;
      value: string;
      valueTone: string;
      detail: string;
    } => value !== null,
  );
}

function distributionHighlight(
  buckets: PredictionsPageViewModel["confidenceDistribution"]["buckets"],
) {
  return Math.max(...buckets.map((bucket) => bucket.count), 0);
}

function compactMetricClass() {
  return "rounded-[14px] border border-[rgba(45,194,255,0.22)] bg-[rgba(8,19,33,0.92)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.015)]";
}

export function PredictionsHeroCard({
  hero,
}: {
  hero: PredictionsPageViewModel["hero"];
}) {
  return (
    <Card className="rounded-[24px] border-[color:var(--border-accent)] bg-[var(--featured-surface)] px-6 py-5 shadow-card sm:px-7 sm:py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-[760px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
            Predictions
          </p>
          <h1 className="mt-4 text-[2.5rem] font-semibold leading-[0.98] tracking-[-0.055em] text-ink sm:text-[3rem]">
            Today&apos;s Predictions
          </h1>
          <p className="mt-3 max-w-[860px] text-[14px] leading-7 text-inkSecondary">
            A curated read on the strongest signals, clearest recommendations, and where the model
            remains uncertain.
          </p>
        </div>

        <div className="rounded-full bg-[rgba(12,25,42,0.92)] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-inkSecondary">
          {hero.dateLabel}
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-4">
        <div className={compactMetricClass()}>
          <div className="flex items-baseline gap-4">
            <p className="numeric text-[2.2rem] font-semibold leading-none tracking-[-0.05em] text-ink">
              {hero.matchesAnalyzed}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-inkMuted">
              Matches analyzed
            </p>
          </div>
        </div>
        <div className={compactMetricClass()}>
          <div className="flex items-baseline gap-4">
            <p className="numeric text-[2.2rem] font-semibold leading-none tracking-[-0.05em] text-ink">
              {hero.publishedPicks}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-inkMuted">
              Published picks
            </p>
          </div>
        </div>
        <div className={compactMetricClass()}>
          <div className="flex items-baseline gap-4">
            <p className="numeric text-[2.2rem] font-semibold leading-none tracking-[-0.05em] text-[var(--accent-lime)]">
              {formatPercent(hero.topConfidence)}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-inkMuted">
              Top confidence
            </p>
          </div>
        </div>
        <div className={compactMetricClass()}>
          <div className="flex items-baseline gap-4">
            <p className="numeric text-[2.2rem] font-semibold leading-none tracking-[-0.05em] text-ink">
              {hero.bestAgreementLabel}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-inkMuted">
              Best agreement
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function TopSignalsRow({
  recommendations,
  edges,
}: {
  recommendations: PredictionsPageViewModel["rankedRecommendations"];
  edges: PredictionsPageViewModel["biggestEdges"];
}) {
  const cards = topSignalCards(recommendations, edges);

  return (
    <section>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
        Top signals
      </p>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.id} className="rounded-[22px] px-5 py-5">
            <Badge tone={card.eyebrowTone} className="px-4 py-2 text-[10px] tracking-[0.14em]">
              {card.eyebrow}
            </Badge>
            <h3 className="mt-5 text-[23px] font-semibold tracking-[-0.04em] text-ink">
              {card.title}
            </h3>
            <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-cyan)]">
              {card.favorite}
            </p>
            <div className="mt-3 flex items-end gap-4">
              <p className={cn("numeric text-[3rem] font-semibold leading-none tracking-[-0.06em]", card.valueTone)}>
                {card.value}
              </p>
              <p className="pb-1 text-[13px] leading-5 text-inkSecondary">{card.detail}</p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function PredictionsCommentaryCard({
  commentary,
  hero,
  topSignals,
}: {
  commentary: PredictionsPageViewModel["commentary"];
  hero: PredictionsPageViewModel["hero"];
  topSignals: PredictionsPageViewModel["topSignals"];
}) {
  const signalPills = [...new Set(topSignals.map((signal) => signal.factor.label))].slice(0, 4);

  return (
    <Card className="rounded-[24px] px-6 py-5 sm:px-7 sm:py-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
        Model commentary
      </p>
      <h2 className="mt-4 max-w-[690px] text-[2rem] font-semibold leading-[1.05] tracking-[-0.05em] text-ink sm:text-[2.3rem]">
        {strongestSignalLabel(hero.strongestSignal)}
      </h2>
      <p className="mt-5 max-w-[760px] text-[14px] leading-7 text-inkSecondary">
        {primaryCommentaryParagraph(commentary, hero)}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        {signalPills.map((label, index) => (
          <div
            key={label}
            className={cn(
              "rounded-full px-5 py-3 text-[12px] font-medium uppercase tracking-[0.08em]",
              index === 0
                ? "bg-[rgba(11,87,142,0.82)] text-[var(--accent-cyan)]"
                : "bg-[rgba(8,19,33,0.92)] text-inkSecondary",
            )}
          >
            {label}
          </div>
        ))}
      </div>
    </Card>
  );
}

export function PredictionsConfidenceCard({
  distribution,
}: {
  distribution: PredictionsPageViewModel["confidenceDistribution"];
}) {
  const maxCount = distributionHighlight(distribution.buckets);

  return (
    <Card className="rounded-[24px] px-5 py-5 sm:px-6 sm:py-6">
      <h2 className="text-[2rem] font-semibold leading-[1.02] tracking-[-0.05em] text-ink">
        Confidence distribution
      </h2>
      <p className="mt-2 text-[13px] text-inkSecondary">
        {distribution.totalCount} published predictions
      </p>

      <div className="mt-6 grid grid-cols-4 items-end gap-3 min-h-[150px]">
        {distribution.buckets.map((bucket) => {
          const isHighlighted = bucket.count === maxCount && bucket.count > 0;
          const height = Math.max(56, Math.round((bucket.count / Math.max(1, maxCount)) * 110));

          return (
            <div key={bucket.key} className="flex flex-col items-center gap-3">
              <div
                className={cn(
                  "flex w-full max-w-[54px] items-start justify-center rounded-[10px] pt-2 text-[16px] font-semibold sm:max-w-[58px]",
                  isHighlighted
                    ? "bg-[linear-gradient(180deg,var(--accent-cyan)_0%,#2ea0ea_100%)] text-white shadow-[0_0_22px_rgba(46,194,255,0.18)]"
                    : "bg-[rgba(15,35,55,0.9)] text-ink",
                )}
                style={{ height }}
              >
                {bucket.count}
              </div>
              <p className="text-[11px] text-inkMuted sm:text-[12px]">{bucket.label}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function RankedRecommendationsCard({
  recommendations,
}: {
  recommendations: PredictionsPageViewModel["rankedRecommendations"];
}) {
  return (
    <section>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
        Ranked recommendations
      </p>
      <h2 className="mt-4 text-[2.35rem] font-semibold leading-[1.02] tracking-[-0.05em] text-ink">
        Best model recommendations
      </h2>
      <p className="mt-2 text-[14px] text-inkSecondary">
        Ordered by confidence, then by factor agreement.
      </p>

      <Card className="mt-5 rounded-[24px] px-4 py-3 sm:px-5">
        {recommendations.slice(0, 4).map((entry, index) => (
          <Link
            key={entry.match.matchId}
            href={`/match/${entry.match.matchId}`}
            className={cn(
              "grid gap-4 px-2 py-5 transition hover:bg-white/[0.01] md:grid-cols-[44px_minmax(0,1.6fr)_120px_84px_128px_56px]",
              index < Math.min(3, recommendations.length - 1) ? "border-b border-white/[0.06]" : "",
            )}
          >
            <div className="text-[28px] font-semibold tracking-[-0.05em] text-[var(--accent-cyan)] md:self-center">
              {rankLabel(index)}
            </div>

            <div className="min-w-0">
              <p className="text-[17px] font-semibold text-ink">
                {entry.match.playerA.name} vs {entry.match.playerB.name}
              </p>
              <p className="mt-2 text-[13px] text-inkSecondary">{recommendationLine(entry)}</p>
            </div>

            <div className="text-[13px] font-semibold text-[var(--accent-cyan)] md:self-center">
              {favoriteName(entry)}
            </div>

            <div className="numeric text-[2rem] font-semibold leading-none tracking-[-0.05em] text-ink md:self-center">
              {formatPercent(entry.favoriteProbability)}
            </div>

            <div className="md:self-center">
              <ConfidenceBadge label={entry.confidenceLabel} />
            </div>

            <div className="text-[15px] font-medium text-inkSecondary md:self-center md:text-right">
              {entry.factorAgreement.favoredPlayerCount}/{entry.factors.length}
            </div>
          </Link>
        ))}
      </Card>
    </section>
  );
}

export function ModelEdgesCard({
  edges,
}: {
  edges: PredictionsPageViewModel["biggestEdges"];
}) {
  return (
    <Card className="rounded-[24px] px-5 py-5 sm:px-6 sm:py-6">
      <h2 className="text-[2rem] font-semibold leading-[1.02] tracking-[-0.05em] text-ink">
        Biggest model edges
      </h2>
      <p className="mt-2 text-[13px] leading-6 text-inkSecondary">
        Largest internal advantages between opposing player signals
      </p>

      <div className="mt-6 space-y-4">
        {edges.map((edge, index) => (
          <Link
            key={edge.id}
            href={`/match/${edge.matchId}`}
            className={cn(
              "block pb-4",
              index < edges.length - 1 ? "border-b border-white/[0.08]" : "",
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[15px] font-semibold text-ink">{edge.favoredPlayerName}</p>
                <p className="mt-2 text-[13px] text-inkSecondary">{edge.factorLabel}</p>
              </div>
              <div className="text-right">
                <p
                  className={cn(
                    "text-[2rem] font-semibold leading-none tracking-[-0.05em]",
                    edge.strength === "strong"
                      ? "text-[var(--accent-lime)]"
                      : edge.strength === "moderate"
                        ? "text-[var(--accent-cyan)]"
                        : "text-ink",
                  )}
                >
                  {edge.magnitudeLabel}
                </p>
                <div className="mt-2 inline-flex rounded-full bg-[rgba(11,87,142,0.82)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink">
                  {sentenceCase(edge.strength)}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <p className="mt-5 text-[13px] leading-6 text-warning">
        These are model-derived feature gaps, not sportsbook market edges.
      </p>
    </Card>
  );
}

export function YesterdayPerformanceCard({
  performance,
}: {
  performance: YesterdayPerformanceViewModel | null;
}) {
  return (
    <Card className="rounded-[24px] px-6 py-5 sm:px-7 sm:py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
            Yesterday&apos;s performance
          </p>
          <h2 className="mt-4 text-[2.5rem] font-semibold leading-[1.02] tracking-[-0.055em] text-ink">
            {performance
              ? `${performance.correctCount} of ${performance.predictionsMade} predictions were correct.`
              : "Yesterday&apos;s performance is pending."}
          </h2>
          <p className="mt-3 text-[14px] leading-7 text-inkSecondary">
            Original probabilities remain visible after results settle.
          </p>
        </div>

        <Link
          href="/model-lab"
          className="text-[15px] font-medium text-[var(--accent-cyan)] transition hover:text-ink"
        >
          View full performance →
        </Link>
      </div>

      {performance ? (
        <div className="mt-6 grid gap-4 xl:grid-cols-4">
          <MetricTile label="Accuracy" value={formatPercent(performance.accuracy)} tone="lime" />
          <MetricTile label="Brier score" value={performance.brierScore.toFixed(3)} />
          <MetricTile
            label="High-confidence"
            value={
              performance.highConfidenceSample > 0
                ? `${Math.round(
                    (performance.highConfidenceAccuracy ?? 0) * performance.highConfidenceSample,
                  )}-${performance.highConfidenceSample -
                    Math.round((performance.highConfidenceAccuracy ?? 0) * performance.highConfidenceSample)}`
                : "N/A"
            }
          />
          <MetricTile
            label="Biggest miss"
            value={
              performance.mostConfidentMiss
                ? `${performance.mostConfidentMiss.label.split(" vs ")[0]} ${Math.round(
                    performance.mostConfidentMiss.probability * 100,
                  )}%`
                : "None"
            }
            tone="warning"
          />
        </div>
      ) : (
        <div className="mt-6 rounded-[18px] bg-[var(--surface-inset)] px-5 py-5">
          <p className="text-[16px] font-medium text-ink">No settled predictions were found for Wednesday, July 22, 2026.</p>
        </div>
      )}
    </Card>
  );
}

export function AllPredictionsLedgerCard({
  entries,
}: {
  entries: PredictionsPageViewModel["predictionLedger"];
}) {
  return (
    <section>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
        All predictions
      </p>
      <h2 className="mt-4 text-[2.35rem] font-semibold leading-[1.02] tracking-[-0.05em] text-ink">
        Prediction ledger
      </h2>
      <p className="mt-2 text-[14px] text-inkSecondary">
        Live picks stay visible alongside settled results so we can track accountability over time.
      </p>

      <Card className="mt-5 rounded-[24px] px-4 py-3 sm:px-5">
        <div className="hidden px-2 pb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-inkMuted md:grid md:grid-cols-[90px_minmax(0,1.8fr)_120px_90px_132px_116px]">
          <span>Date</span>
          <span>Match</span>
          <span>Model pick</span>
          <span>Win %</span>
          <span>Confidence</span>
          <span>Result</span>
        </div>

        {entries.map((entry, index) => {
          const rowContent = (
            <>
              <div className="md:self-center">
                <p className="text-[14px] font-semibold text-ink">
                  {formatLedgerDate(entry.matchDate, entry.scheduledAt)}
                </p>
                <p className="mt-2 text-[12px] text-inkMuted">{entry.modelVersion}</p>
              </div>

              <div className="min-w-0">
                <p className="text-[17px] font-semibold text-ink">{entry.matchLabel}</p>
                <p className="mt-2 text-[13px] text-inkSecondary">{entry.tournamentLabel}</p>
                <p className="mt-2 text-[12px] text-inkMuted">
                  {entry.status === "upcoming"
                    ? entry.topFactorLabel
                      ? `Top factor: ${entry.topFactorLabel}`
                      : "Awaiting settlement"
                    : entry.settledWinnerName
                      ? `${entry.statusLabel} · ${entry.settledWinnerName}${entry.settledScore ? ` · ${entry.settledScore}` : ""}`
                      : entry.statusLabel}
                </p>
              </div>

              <div className="md:self-center">
                <p className="text-[14px] font-semibold text-[var(--accent-cyan)]">{entry.favoriteName}</p>
              </div>

              <div className="numeric text-[2rem] font-semibold leading-none tracking-[-0.05em] text-ink md:self-center">
                {formatPercent(entry.favoriteProbability)}
              </div>

              <div className="md:self-center">
                <ConfidenceBadge label={entry.confidenceLabel} score={entry.confidenceScore} />
              </div>

              <div className="md:self-center md:justify-self-start">
                <Badge tone={ledgerStatusTone(entry.status)}>{entry.statusLabel}</Badge>
              </div>
            </>
          );

          if (!entry.detailHref) {
            return (
              <div
                key={`${entry.matchId}-${entry.generatedAt}`}
                className={cn(
                  "grid gap-4 px-2 py-5 md:grid-cols-[90px_minmax(0,1.8fr)_120px_90px_132px_116px]",
                  index < entries.length - 1 ? "border-b border-white/[0.06]" : "",
                )}
              >
                {rowContent}
              </div>
            );
          }

          return (
            <Link
              key={`${entry.matchId}-${entry.generatedAt}`}
              href={entry.detailHref}
              className={cn(
                "grid gap-4 px-2 py-5 transition hover:bg-white/[0.01] md:grid-cols-[90px_minmax(0,1.8fr)_120px_90px_132px_116px]",
                index < entries.length - 1 ? "border-b border-white/[0.06]" : "",
              )}
            >
              {rowContent}
            </Link>
          );
        })}
      </Card>
    </section>
  );
}

function MetricTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "lime" | "warning";
}) {
  return (
    <div className="rounded-[14px] border border-[rgba(45,194,255,0.2)] bg-[rgba(8,19,33,0.92)] px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-inkMuted">{label}</p>
      <p
        className={cn(
          "mt-4 text-[2rem] font-semibold leading-none tracking-[-0.05em]",
          tone === "lime"
            ? "text-[var(--accent-lime)]"
            : tone === "warning"
              ? "text-warning"
              : "text-ink",
        )}
      >
        {value}
      </p>
    </div>
  );
}
