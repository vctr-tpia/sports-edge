import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { FactorRow } from "@/components/analysis/factor-row";
import { MatchCard } from "@/components/matches/match-card";
import { ConfidenceBadge } from "@/components/predictions/confidence-badge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { getOverviewViewModel } from "@/src/lib/app-view-models";

function sentenceCase(value: string) {
  return value
    .split("_")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function formatGeneratedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(value));
}

export default async function HomePage() {
  const overview = await getOverviewViewModel();

  return (
    <AppShell breadcrumbs={[{ label: "Overview" }]} freshnessLabel={overview.freshnessLabel}>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Sports Edge"
          title="ATP predictions with context, disagreement, and model accountability."
          description="The overview is built to answer three questions quickly: which ATP matches are live in our pipeline, who the model favors, and why that advantage exists without overstating certainty."
          actionHref="/matches"
          actionLabel="Browse matches"
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {overview.metricCards.map((metric) => (
            <MetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              detail={metric.detail}
            />
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          {overview.featuredMatch ? (
            <Card elevated className="rounded-hero p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="brand">Featured match</Badge>
                    <Badge tone="neutral">
                      {overview.featuredMatch.tournamentName}
                    </Badge>
                  </div>
                  <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-ink sm:text-4xl">
                    {overview.featuredMatch.playerA.name} vs {overview.featuredMatch.playerB.name}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-inkSecondary">
                    {[overview.featuredMatch.surface, overview.featuredMatch.round]
                      .filter(Boolean)
                      .map((part) => sentenceCase(String(part)))
                      .join(" • ")}
                    {overview.featuredMatch.providerTimeLabel
                      ? ` • ${overview.featuredMatch.providerTimeLabel}`
                      : ""}
                  </p>
                </div>
                <ConfidenceBadge
                  label={overview.featuredMatch.confidenceLabel}
                  score={overview.featuredMatch.confidenceScore}
                />
              </div>

              <div className="mt-6">
                <MatchCard match={overview.featuredMatch} compact />
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {overview.featuredFactors.map((factor) => (
                  <FactorRow
                    key={factor.key}
                    factor={factor}
                    playerAName={overview.featuredMatch?.playerA.name ?? "Player A"}
                    playerBName={overview.featuredMatch?.playerB.name ?? "Player B"}
                  />
                ))}
              </div>
            </Card>
          ) : (
            <EmptyState
              title="No featured ATP match is available"
              description="Upcoming fixtures have not been mapped into a prediction snapshot yet. The dashboard will populate after the next successful refresh."
            />
          )}

          <div className="space-y-6">
            <Card className="rounded-hero p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-inkMuted">
                Confidence distribution
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-ink">
                How decisive today&apos;s slate looks
              </h2>
              <div className="mt-5 space-y-4">
                {overview.confidenceDistribution.map((bucket) => {
                  const total = Math.max(
                    1,
                    overview.confidenceDistribution.reduce(
                      (sum, entry) => sum + entry.count,
                      0,
                    ),
                  );

                  return (
                    <div key={bucket.label}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-inkSecondary">
                          {sentenceCase(bucket.label)}
                        </span>
                        <span className="numeric text-ink">{bucket.count}</span>
                      </div>
                      <ProgressBar value={bucket.count / total} tone="brand" />
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="rounded-hero p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-inkMuted">
                System status
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-ink">
                Data freshness and MVP guardrails
              </h2>
              <div className="mt-5 space-y-4 text-sm leading-7 text-inkSecondary">
                <p>
                  Last ATP refresh:{" "}
                  <span className="text-ink">
                    {formatGeneratedAt(overview.generatedAt)}
                  </span>
                </p>
                <p>
                  Only ATP singles fixtures mapped confidently into our historical player pool are
                  shown. Unknown identities stay excluded instead of being guessed into the model.
                </p>
                <p>
                  Win probability is model-generated. Confidence describes separation between
                  players, not certainty that a prediction will settle correctly.
                </p>
              </div>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-inkMuted">
                Today&apos;s predictions
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">
                Upcoming ATP matches in the current prediction window
              </h2>
            </div>
            <Link
              href="/predictions"
              className="text-sm font-medium text-inkSecondary transition hover:text-ink"
            >
              View all predictions
            </Link>
          </div>
          {overview.upcomingMatches.length > 0 ? (
            <div className="grid gap-5 xl:grid-cols-2">
              {overview.upcomingMatches.map((match) => (
                <MatchCard key={match.matchId} match={match} compact />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Predictions are waiting on the next refresh"
              description="This view will fill once the upcoming ATP feed and feature snapshot pipeline complete successfully."
            />
          )}
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-inkMuted">
              Model performance
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">
              Recent benchmark context
            </h2>
          </div>
          {overview.performanceHighlights.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {overview.performanceHighlights.map((metric) => (
                <MetricCard
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                  detail={metric.detail}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Evaluation metrics are not available yet"
              description="The overview only shows recent backtest performance when the internal evaluation tables are populated."
            />
          )}
        </section>
      </div>
    </AppShell>
  );
}
