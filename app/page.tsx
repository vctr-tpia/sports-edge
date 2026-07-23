import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getMatchDetailViewModel,
  getOverviewViewModel,
  type MatchDetailViewModel,
  type MatchPredictionViewModel,
} from "@/src/lib/app-view-models";
import { cn } from "@/src/lib/cn";

function sentenceCase(value: string) {
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

function formatMetricDetail(detail: string) {
  return detail;
}

function compactFreshnessLabel(value: string) {
  const match = value.match(/(\d+)\s+min/i);
  if (!match) {
    return value.toUpperCase();
  }

  const minutes = Number(match[1]);
  if (Number.isNaN(minutes)) {
    return value.toUpperCase();
  }

  if (minutes >= 1440) {
    const days = Math.round(minutes / 1440);
    return `ATP DATA UPDATED ${days} DAY${days === 1 ? "" : "S"} AGO`;
  }

  if (minutes >= 60) {
    const hours = Math.round(minutes / 60);
    return `ATP DATA UPDATED ${hours} HR${hours === 1 ? "" : "S"} AGO`;
  }

  return value.toUpperCase();
}

function freshnessToneStyles(tone: "healthy" | "warning" | "neutral") {
  switch (tone) {
    case "warning":
      return {
        wrapper: "border-[rgba(255,184,77,0.35)] bg-[rgba(52,31,8,0.92)]",
        text: "text-warning",
      };
    case "neutral":
      return {
        wrapper: "border-white/[0.08] bg-[#0c1724]",
        text: "text-inkSecondary",
      };
    default:
      return {
        wrapper: "border-court/20 bg-[#0c1724]",
        text: "text-court",
      };
  }
}

function getPlayerMarker(player: MatchPredictionViewModel["playerA"]) {
  return player.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function probabilityValue(value?: number | null) {
  return `${Math.round((value ?? 0) * 100)}%`;
}

function confidenceLabelText(value?: string | null) {
  if (!value) {
    return "Unavailable";
  }

  return sentenceCase(value);
}

function getFavoriteName(match: MatchPredictionViewModel) {
  return match.favoredPlayerId === match.playerA.id ? match.playerA.name : match.playerB.name;
}

function getFavoriteProbability(match: MatchPredictionViewModel) {
  return match.favoredPlayerId === match.playerA.id
    ? match.playerAProbability ?? 0.5
    : match.playerBProbability ?? 0.5;
}

function getConfidenceValue(match: MatchPredictionViewModel) {
  return match.confidenceScore ?? 0;
}

function buildConfidenceBars(
  totalMatchCount: number,
  distribution: Array<{ label: string; count: number }>,
) {
  const confidenceLabels = ["low", "moderate", "high", "very_high"] as const;
  const labelToCount = new Map(distribution.map((bucket) => [bucket.label, bucket.count]));
  const labeledCount = distribution.reduce((sum, bucket) => sum + bucket.count, 0);
  const unlabeledCount = Math.max(0, totalMatchCount - labeledCount);

  return [
    ...confidenceLabels.map((label) => ({
      key: label,
      label: confidenceLabelText(label),
      count: labelToCount.get(label) ?? 0,
    })),
    {
      key: "unrated",
      label: "Unrated",
      count: unlabeledCount,
    },
  ];
}

function kpiAccent(index: number) {
  return [
    "bg-brand",
    "bg-court",
    "bg-[var(--accent-cyan)]",
    "bg-warning",
  ][index] ?? "bg-brand";
}

function barWidth(value: number, maxValue: number) {
  if (maxValue <= 0) {
    return "50%";
  }

  return `${Math.max(16, Math.round((value / maxValue) * 100))}%`;
}

const panelClass =
  "rounded-[24px] border border-[color:var(--border-default)] bg-[linear-gradient(180deg,rgba(255,255,255,0.012),rgba(255,255,255,0)),var(--surface-card)] shadow-panel";

const featuredPanelClass =
  "relative overflow-hidden rounded-[24px] border border-[color:var(--border-accent)] bg-[var(--featured-surface)] shadow-card";

function DesktopHeader() {
  return (
    <section className="pb-8 pt-12">
      <div className="flex items-start justify-between gap-8">
        <div className="max-w-[690px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
            Overview
          </p>
          <h1 className="mt-5 text-[54px] font-bold leading-[0.98] tracking-[-0.055em] text-ink">
            ATP predictions, explained.
          </h1>
          <p className="mt-4 max-w-[680px] text-[14px] leading-7 text-inkSecondary">
            Daily match intelligence built around probability, disagreement, and model
            accountability.
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-5 pt-2">
          <ButtonLink
            href="/matches"
            variant="primary"
            className="min-h-[58px] min-w-[244px] rounded-[18px] px-7 text-[15px] shadow-[0_14px_28px_rgba(46,194,255,0.14)]"
          >
            Browse matches
            <span aria-hidden="true">→</span>
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

function MobileHeader({
  freshnessLabel,
  freshnessTone,
}: {
  freshnessLabel: string;
  freshnessTone: "healthy" | "warning" | "neutral";
}) {
  const toneStyles = freshnessToneStyles(freshnessTone);

  return (
    <section className="pb-6 pt-1">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-brand">
            Sports Edge
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-inkSecondary">
            ATP analytics
          </p>
        </div>
        <div className={`max-w-[188px] rounded-[14px] border px-3 py-2 ${toneStyles.wrapper}`}>
          <p className={`truncate text-[9px] font-semibold uppercase tracking-[0.08em] ${toneStyles.text}`}>
            {"\u25cf"} {freshnessLabel}
          </p>
        </div>
      </div>

      <div className="mt-7">
        <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-brand">Overview</p>
        <h1 className="mt-3 max-w-[320px] text-[36px] font-bold leading-[1] tracking-[-0.06em] text-ink">
          ATP predictions, explained.
        </h1>
        <p className="mt-4 max-w-[320px] text-[15px] leading-7 text-inkSecondary">
          Daily match intelligence built around probability, disagreement, and model
          accountability.
        </p>
      </div>

      <ButtonLink
        href="/matches"
        variant="primary"
        className="mt-6 min-h-[52px] w-full rounded-[16px] text-[16px]"
      >
        Browse matches
        <span aria-hidden="true">→</span>
      </ButtonLink>
    </section>
  );
}

function KpiCard({
  index,
  label,
  value,
  detail,
  mobile = false,
}: {
  index: number;
  label: string;
  value: string;
  detail: string;
  mobile?: boolean;
}) {
  const isStringValue = /[a-z]/i.test(value);

  return (
    <div className={cn(panelClass, mobile ? "min-h-[150px] p-5" : "h-[154px] p-6")}>
      <div className={cn("h-1 rounded-full", mobile ? "w-10" : "w-12", kpiAccent(index))} />
      <p
        className={cn(
          "mt-5 font-semibold uppercase tracking-[0.18em] text-inkSecondary",
          mobile ? "text-[11px]" : "text-[11px]",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "numeric mt-4 font-bold leading-none tracking-[-0.05em] text-ink",
          mobile
            ? isStringValue
              ? "text-[2.05rem] leading-[0.94]"
              : "text-[2.25rem]"
            : isStringValue
              ? "text-[1.85rem] leading-[0.98]"
              : "text-[2.35rem]",
        )}
      >
        {value}
      </p>
      <p className={cn("mt-2.5 text-inkSecondary", mobile ? "text-[12px] leading-5" : "text-[13px] leading-6")}>
        {formatMetricDetail(detail)}
      </p>
    </div>
  );
}

function FeaturedMatchCard({
  match,
  detail,
  mobile = false,
}: {
  match: MatchPredictionViewModel;
  detail: MatchDetailViewModel | null;
  mobile?: boolean;
}) {
  const favoriteProbability = getFavoriteProbability(match);
  const underdogProbability =
    match.favoredPlayerId === match.playerA.id
      ? match.playerBProbability ?? 0.5
      : match.playerAProbability ?? 0.5;
  const favoriteName = getFavoriteName(match);

  return (
    <section
      className={cn(
        featuredPanelClass,
        mobile ? "p-5" : "flex min-h-[356px] flex-col p-8",
      )}
    >
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-[var(--featured-border-glow)]" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge tone="brand" className={mobile ? "" : "px-4 py-1.5 text-[11px]"}>
          Featured match
        </Badge>
        <Badge tone="positive" className={mobile ? "" : "px-4 py-1.5 text-[11px]"}>
          {confidenceLabelText(match.confidenceLabel)}
        </Badge>
      </div>

      <p
        className={cn(
          "mt-5 font-semibold uppercase tracking-[0.12em] text-inkSecondary",
          mobile ? "text-[11px]" : "text-[12px]",
        )}
      >
        {match.tournamentName}
        {match.round ? ` · ${sentenceCase(match.round)}` : ""}
      </p>
      <p className={cn("mt-2 text-inkSecondary", mobile ? "text-[12px]" : "text-[14px]")}>
        {match.surface ? sentenceCase(match.surface) : "Surface unavailable"}
        {match.bestOf ? ` · Best of ${match.bestOf}` : ""}
        {` · ${formatSchedule(match.scheduledAt, match.matchDate)}`}
      </p>

      <div
        className={cn(
          "mt-10 gap-6",
          mobile
            ? "space-y-5"
            : "grid grid-cols-[minmax(0,1fr)_196px_minmax(0,1fr)] items-center gap-5",
        )}
      >
        <div className={cn("flex items-center gap-4", mobile && "justify-between")}>
          <div className={cn("flex shrink-0 items-center justify-center rounded-full bg-[var(--accent-blue)] font-bold text-white", mobile ? "h-[64px] w-[64px] text-[20px]" : "h-[92px] w-[92px] text-[22px]")}>
            {getPlayerMarker(match.playerA)}
          </div>
          <div className={cn("min-w-0", !mobile && "max-w-[214px]")}>
            <h2
              className={cn(
                "truncate font-semibold tracking-[-0.05em] text-ink",
                mobile
                  ? "text-[1.75rem] leading-[1.02]"
                  : "text-[18px] leading-[1.08]",
              )}
            >
              {match.playerA.name}
            </h2>
            <p className={cn("mt-2 text-inkSecondary", mobile ? "text-[13px]" : "text-[13px]")}>
              {match.playerA.ranking ? `Rank #${match.playerA.ranking}` : "Rank unavailable"}
              {match.playerA.countryCode ? ` · ${match.playerA.countryCode}` : ""}
            </p>
          </div>
        </div>

        <div className={cn("text-center", mobile && "rounded-[18px] bg-[var(--surface-inset)] px-4 py-5")}>
          <p
            className={cn(
              "font-semibold uppercase tracking-[0.18em] text-[var(--accent-cyan)]",
              mobile ? "text-[10px]" : "text-[12px]",
            )}
          >
            Model pick
          </p>
          <p
            className={cn(
              "numeric mt-3 font-bold leading-none tracking-[-0.08em] text-[var(--accent-lime)]",
              mobile ? "text-[3.7rem]" : "text-[5.1rem]",
            )}
          >
            {probabilityValue(favoriteProbability)}
          </p>
          <p
            className={cn(
              "mt-3 font-semibold text-[var(--accent-lime)]",
              mobile ? "text-[13px]" : "text-[16px]",
            )}
          >
            {favoriteName} favored
          </p>
        </div>

        <div className={cn("flex items-center gap-4", mobile ? "justify-between" : "justify-end")}>
          <div className={cn("min-w-0", mobile ? "" : "max-w-[214px] text-right")}>
            <h2
              className={cn(
                "truncate font-semibold tracking-[-0.05em] text-ink",
                mobile
                  ? "text-[1.75rem] leading-[1.02]"
                  : "text-[18px] leading-[1.08]",
              )}
            >
              {match.playerB.name}
            </h2>
            <p className={cn("mt-2 text-inkSecondary", mobile ? "text-[13px]" : "text-[13px]")}>
              {match.playerB.ranking ? `Rank #${match.playerB.ranking}` : "Rank unavailable"}
              {match.playerB.countryCode ? ` · ${match.playerB.countryCode}` : ""}
            </p>
          </div>
          <div className={cn("flex shrink-0 items-center justify-center rounded-full bg-[#162334] font-bold text-white", mobile ? "h-[64px] w-[64px] text-[20px]" : "h-[92px] w-[92px] text-[22px]")}>
            {getPlayerMarker(match.playerB)}
          </div>
        </div>
      </div>

      <div className={cn(mobile ? "mt-8" : "mt-auto pt-8")}>
        <div className={cn("rounded-full bg-[var(--progress-track)]", mobile ? "h-3" : "h-3.5")}>
          <div
            className="h-full rounded-full shadow-[0_0_16px_rgba(46,194,255,0.2)]"
            style={{ background: "var(--progress-fill)", width: probabilityValue(favoriteProbability) }}
          />
        </div>
        <div className={cn("mt-3 flex items-center justify-between font-semibold", mobile ? "text-[13px]" : "text-[15px]")}>
          <span className="text-[var(--accent-lime)]">{probabilityValue(favoriteProbability)}</span>
          <span className="text-inkSecondary">{probabilityValue(underdogProbability)}</span>
        </div>
      </div>

      <div className="mt-6 rounded-[18px] bg-[var(--surface-inset)] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-inkSecondary">
              Top factor
            </span>
            <span className={cn("truncate font-semibold text-ink", mobile ? "text-[13px]" : "text-[15px]")}>
              {match.topFactorLabel ?? "Factor unavailable"}
            </span>
          </div>
          {detail ? (
            <Link
              href={`/match/${match.matchId}`}
              className={cn(
                "font-semibold text-[var(--accent-cyan)] transition hover:text-[var(--accent-cyan)]",
                mobile ? "text-[13px]" : "text-[15px]",
              )}
            >
              View analysis →
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function TodaySlateCard({
  matches,
  title,
  subtitle,
  mobile = false,
}: {
  matches: MatchPredictionViewModel[];
  title: string;
  subtitle: string;
  mobile?: boolean;
}) {
  if (matches.length === 0) {
    return (
      <EmptyState
        title="No upcoming slate is available"
        description="The next ATP refresh will repopulate the next scheduled match slate."
      />
    );
  }

  return (
    <section className={cn(panelClass, mobile ? "p-5" : "min-h-[356px] p-7")}>
      <h2 className={cn("font-semibold tracking-[-0.05em] text-ink", mobile ? "text-[1.9rem]" : "text-[22px]")}>
        {title}
      </h2>
      <p className={cn("mt-2 text-inkSecondary", mobile ? "text-[13px]" : "text-[14px]")}>
        {subtitle}
      </p>

      <div className={cn(mobile ? "mt-5 space-y-0" : "mt-8 space-y-0")}>
        {matches.map((match, index) => (
          <Link
            key={match.matchId}
            href={`/match/${match.matchId}`}
            className={cn(
              "block transition hover:bg-white/[0.02]",
              mobile ? "px-1 py-4" : "px-1 py-7",
              index > 0 && "border-t border-white/[0.06]",
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className={cn("font-semibold text-ink", mobile ? "text-[15px]" : "text-[13px] leading-7")}>
                  {match.playerA.name} <span className="text-inkSecondary">vs</span> {match.playerB.name}
                </p>
                <p
                  className={cn(
                    "mt-2 font-medium text-inkSecondary",
                    mobile ? "text-[11px]" : "text-[13px]",
                )}
              >
                ATP · {match.surface ? sentenceCase(match.surface) : "Surface unavailable"} ·{" "}
                {confidenceLabelText(match.confidenceLabel)}
                </p>
              </div>
              <p
                className={cn(
                  "numeric shrink-0 font-bold tracking-[-0.05em]",
                  index === 0 ? "text-[var(--accent-lime)]" : "text-ink",
                  mobile ? "text-[1.8rem]" : "text-[1.1rem]",
                )}
              >
                {probabilityValue(getFavoriteProbability(match))}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ModelSignalsCard({
  detail,
  mobile = false,
}: {
  detail: MatchDetailViewModel | null;
  mobile?: boolean;
}) {
  if (!detail || detail.factors.length === 0) {
    return (
      <EmptyState
        title="Prediction signals are unavailable"
        description="The featured match does not yet have a factor breakdown."
      />
    );
  }

  const factors = detail.factors.slice(0, 5);
  const maxEdge = Math.max(...factors.map((factor) => factor.edgeMagnitude), 0.001);

  return (
    <section className={cn(panelClass, mobile ? "p-5" : "min-h-[378px] p-7")}>
      <h2 className={cn("font-semibold tracking-[-0.05em] text-ink", mobile ? "text-[1.9rem]" : "text-[22px]")}>
        Why the model leans {detail.favoredPlayerName.split(" ").slice(-1)[0]}
      </h2>
      <p className={cn("mt-2 text-inkSecondary", mobile ? "text-[13px]" : "text-[14px]")}>
        Signals are directional, not guarantees.
      </p>

      <div className={cn(mobile ? "mt-6 space-y-5" : "mt-8 space-y-8")}>
        {factors.map((factor) => (
          <div key={factor.key}>
            <div className={cn("gap-3", mobile ? "space-y-3" : "grid grid-cols-[168px_1fr_80px] items-center gap-8")}>
              <div className={mobile ? "flex items-center justify-between gap-3" : ""}>
                <div>
                  <p className={cn("font-medium text-ink", mobile ? "text-[14px]" : "text-[16px]")}>{factor.label}</p>
                  <p className={cn("mt-1 text-inkSecondary", mobile ? "text-[12px]" : "text-[14px]")}>
                    {sentenceCase(factor.strength)} advantage
                  </p>
                </div>
                {mobile ? (
                  <p
                    className={cn(
                      "shrink-0 text-[12px] font-semibold",
                      factor.favoredPlayerId === detail.match.favoredPlayerId
                        ? "text-ink"
                        : factor.favoredPlayerId
                          ? "text-warning"
                          : "text-inkSecondary",
                    )}
                  >
                    {factor.favoredPlayerName ?? "—"}
                  </p>
                ) : null}
              </div>
              <div className="h-3.5 rounded-full bg-[var(--progress-track)]">
                <div
                  className="h-full rounded-full shadow-[0_0_14px_rgba(46,194,255,0.24)]"
                  style={{
                    background: "var(--progress-fill)",
                    width: barWidth(factor.edgeMagnitude, maxEdge),
                  }}
                />
              </div>
              {!mobile ? (
                <p
                  className={cn(
                    "text-[14px] font-semibold text-right",
                    factor.favoredPlayerId === detail.match.favoredPlayerId
                      ? "text-ink"
                      : factor.favoredPlayerId
                        ? "text-warning"
                        : "text-inkSecondary",
                  )}
                >
                  {factor.favoredPlayerName ?? "—"}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-[18px] bg-[var(--surface-inset)] px-5 py-4 text-[14px] text-inkSecondary">
        {detail.factorAgreement.favoredPlayerCount} of {detail.factors.length} factors support{" "}
        {detail.favoredPlayerName}
        {detail.factorAgreement.underdogCount > 0
          ? ` · ${detail.factorAgreement.underdogCount} opposing signals`
          : ""}
      </div>
    </section>
  );
}

function ConfidenceDistributionCard({
  totalCount,
  averageConfidence,
  distribution,
  mobile = false,
}: {
  totalCount: number;
  averageConfidence: number;
  distribution: Array<{ label: string; count: number }>;
  mobile?: boolean;
}) {
  const buckets = buildConfidenceBars(totalCount, distribution);
  const maxCount = Math.max(...buckets.map((bucket) => bucket.count), 1);
  const maxBucketCount = Math.max(...buckets.map((bucket) => bucket.count), 0);

  return (
    <section className={cn(panelClass, mobile ? "p-5" : "min-h-[378px] p-7")}>
      <div className={cn("gap-5", mobile ? "space-y-5" : "flex items-start justify-between")}>
        <div>
          <h2 className={cn("font-semibold tracking-[-0.05em] text-ink", mobile ? "text-[1.9rem]" : "text-[22px]")}>
            Confidence distribution
          </h2>
          <p className={cn("mt-2 text-inkSecondary", mobile ? "text-[13px]" : "text-[14px]")}>
            Across {totalCount} loaded upcoming match predictions
          </p>
        </div>

        <div className="rounded-[18px] bg-[var(--surface-inset)] px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-inkSecondary">
            Avg confidence
          </p>
          <p className="numeric mt-3 text-[2.35rem] font-bold leading-none tracking-[-0.05em] text-ink">
            {Math.round(averageConfidence * 100)}%
          </p>
        </div>
      </div>

      <div className={cn("mt-10 grid items-end", mobile ? "h-[180px] grid-cols-5 gap-3" : "h-[228px] grid-cols-5 gap-5")}>
        {buckets.map((bucket) => {
          const highlighted = bucket.count === maxBucketCount && maxBucketCount > 0;

          return (
            <div key={bucket.key} className="flex h-full flex-col justify-end">
              <div
                className={cn(
                  "rounded-[12px] transition",
                  highlighted
                    ? "shadow-[0_0_18px_rgba(46,194,255,0.28)]"
                    : "bg-[var(--chart-inactive)]",
                )}
                style={{
                  background: highlighted ? "var(--accent-cyan)" : "var(--chart-inactive)",
                  height: `${Math.max(14, Math.round((bucket.count / maxCount) * (mobile ? 132 : 178)))}px`,
                }}
              />
              <p className={cn("mt-4 text-center font-medium text-inkSecondary", mobile ? "text-[10px]" : "text-[12px]")}>
                {bucket.label}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DesktopOverview({
  overview,
  featuredDetail,
  slateMatches,
}: {
  overview: Awaited<ReturnType<typeof getOverviewViewModel>>;
  featuredDetail: MatchDetailViewModel | null;
  slateMatches: MatchPredictionViewModel[];
}) {
  return (
    <div className="hidden min-[768px]:block">
      <DesktopHeader />

      <section className="grid gap-6 min-[768px]:grid-cols-2 min-[1280px]:grid-cols-4">
        {overview.metricCards.map((metric, index) => (
          <KpiCard
            key={metric.label}
            index={index}
            label={metric.label}
            value={metric.value}
            detail={metric.detail}
          />
        ))}
      </section>

      <section className="mt-6 grid gap-6 min-[1024px]:grid-cols-12 min-[1280px]:grid-cols-[760px_348px]">
        <div className="min-[1024px]:col-span-8 min-[1280px]:col-span-1">
          <FeaturedMatchCard match={overview.featuredMatch!} detail={featuredDetail} />
        </div>
        <div className="min-[1024px]:col-span-4 min-[1280px]:col-span-1">
          <TodaySlateCard
            matches={slateMatches}
            title={overview.slateTitle}
            subtitle={overview.slateSubtitle}
          />
        </div>
      </section>

      <section className="mt-6 grid gap-6 min-[1280px]:grid-cols-2">
        <ModelSignalsCard detail={featuredDetail} />
        <ConfidenceDistributionCard
          totalCount={overview.allUpcomingMatchCount}
          averageConfidence={overview.averageConfidence}
          distribution={overview.confidenceDistribution}
        />
      </section>
    </div>
  );
}

function MobileOverview({
  overview,
  featuredDetail,
  slateMatches,
}: {
  overview: Awaited<ReturnType<typeof getOverviewViewModel>>;
  featuredDetail: MatchDetailViewModel | null;
  slateMatches: MatchPredictionViewModel[];
}) {
  return (
    <div className="min-[768px]:hidden">
      <MobileHeader
        freshnessLabel={overview.freshnessLabel}
        freshnessTone={overview.freshnessTone}
      />

      <section className="grid grid-cols-2 gap-4">
        {overview.metricCards.map((metric, index) => (
          <KpiCard
            key={metric.label}
            index={index}
            label={metric.label}
            value={metric.value}
            detail={metric.detail}
            mobile
          />
        ))}
      </section>

      <div className="mt-4 space-y-4">
        <FeaturedMatchCard match={overview.featuredMatch!} detail={featuredDetail} mobile />
        <TodaySlateCard
          matches={slateMatches}
          title={overview.slateTitle}
          subtitle={overview.slateSubtitle}
          mobile
        />
        <ModelSignalsCard detail={featuredDetail} mobile />
        <ConfidenceDistributionCard
          totalCount={overview.allUpcomingMatchCount}
          averageConfidence={overview.averageConfidence}
          distribution={overview.confidenceDistribution}
          mobile
        />
      </div>
    </div>
  );
}

export default async function HomePage() {
  const overview = await getOverviewViewModel();
  const freshnessLabel = compactFreshnessLabel(overview.freshnessLabel);
  const featuredDetail = overview.featuredMatch
    ? await getMatchDetailViewModel(overview.featuredMatch.matchId)
    : null;
  const slateMatches = overview.slateMatches;

  return (
    <AppShell
      breadcrumbs={[
        { label: "ATP", href: "/" },
        { label: "Sports Edge" },
      ]}
      freshnessLabel={freshnessLabel}
      freshnessTone={overview.freshnessTone}
      showMobileTopBar={false}
    >
      {overview.featuredMatch ? (
        <>
          <DesktopOverview
            overview={{ ...overview, freshnessLabel }}
            featuredDetail={featuredDetail}
            slateMatches={slateMatches}
          />
          <MobileOverview
            overview={{ ...overview, freshnessLabel }}
            featuredDetail={featuredDetail}
            slateMatches={slateMatches}
          />
        </>
      ) : (
        <EmptyState
          title="No featured ATP match is available"
          description="Upcoming fixtures have not been mapped into a prediction snapshot yet. The dashboard will repopulate after the next successful refresh."
        />
      )}
    </AppShell>
  );
}
