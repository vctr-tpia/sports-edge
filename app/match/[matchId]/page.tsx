import { notFound } from "next/navigation";
import { FactorAgreement } from "@/components/analysis/factor-agreement";
import { FactorRow } from "@/components/analysis/factor-row";
import { FormSequence } from "@/components/analysis/form-sequence";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { PlayerComparison } from "@/components/analysis/player-comparison";
import { PredictionHero } from "@/components/predictions/prediction-hero";
import { ProjectionCard } from "@/components/predictions/projection-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getMatchDetailViewModel } from "@/src/lib/app-view-models";

function sentenceCase(value: string) {
  return value
    .split("_")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function formatSchedule(value?: string | null, fallbackDate?: string | null) {
  if (!value) {
    return fallbackDate ?? "Time unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(value));
}

function formatPercent(value?: number | null) {
  if (value === null || value === undefined) {
    return "Unavailable";
  }

  return `${Math.round(value * 100)}%`;
}

function formatProjection(value?: number | null, digits = 1) {
  if (value === null || value === undefined) {
    return "Unavailable";
  }

  return value.toFixed(digits);
}

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const detail = await getMatchDetailViewModel(matchId);

  if (!detail) {
    notFound();
  }

  const { match } = detail;
  const metaLine = [
    match.tournamentName,
    match.tournamentLevel ? sentenceCase(match.tournamentLevel) : null,
    match.round ? sentenceCase(match.round) : null,
    match.surface ? sentenceCase(match.surface) : null,
    match.bestOf ? `Best of ${match.bestOf}` : null,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <AppShell
      breadcrumbs={[
        { label: "Matches", href: "/matches" },
        { label: match.tournamentName },
        { label: `${match.playerA.name} vs ${match.playerB.name}` },
      ]}
      freshnessLabel={
        match.generatedAt ? `Prediction generated ${formatSchedule(match.generatedAt)}` : null
      }
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="Match analysis"
          title={`${match.playerA.name} vs ${match.playerB.name}`}
          description={`${metaLine}${match.city ? ` • ${match.city}` : ""}${match.countryCode ? `, ${match.countryCode}` : ""}`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Badge tone={detail.kind === "upcoming" ? "brand" : "neutral"}>
                {detail.kind === "upcoming" ? "Upcoming" : "Historical"}
              </Badge>
              {match.modelVersion ? (
                <Badge tone="neutral">Model {match.modelVersion}</Badge>
              ) : null}
            </div>
          }
        />

        <PredictionHero detail={detail} />

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-inkMuted">
                Why the model leans this way
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">
                Primary factors behind the predicted advantage
              </h2>
            </div>
            {detail.factors.map((factor) => (
              <FactorRow
                key={factor.key}
                factor={factor}
                playerAName={match.playerA.name}
                playerBName={match.playerB.name}
              />
            ))}
          </div>

          <div className="space-y-6">
            <FactorAgreement detail={detail} />

            <Card className="rounded-hero p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-inkMuted">
                Counter-signals
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-ink">
                What still supports the other side
              </h2>
              {detail.counterFactors.length > 0 ? (
                <div className="mt-5 space-y-3">
                  {detail.counterFactors.map((factor) => (
                    <div
                      key={`counter-${factor.key}`}
                      className="rounded-2xl border border-borderSubtle bg-surface2 p-4"
                    >
                      <p className="text-sm font-medium text-ink">{factor.label}</p>
                      <p className="mt-2 text-sm leading-6 text-inkSecondary">
                        {factor.favoredPlayerName} owns the stronger signal here, which is why the
                        pick should be read as an edge rather than a guarantee.
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-5 text-sm leading-7 text-inkSecondary">
                  No meaningful counter-signal is currently larger than the model&apos;s main
                  supporting factors.
                </p>
              )}
            </Card>

            <Card className="rounded-hero p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-inkMuted">
                Model context
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-ink">
                How the model behaves in similar spots
              </h2>
              {detail.similarContext ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-borderSubtle bg-surface2 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-inkMuted">
                      Surface accuracy
                    </p>
                    <p className="numeric mt-2 text-2xl font-semibold text-ink">
                      {detail.similarContext.surfaceAccuracy !== null &&
                      detail.similarContext.surfaceAccuracy !== undefined
                        ? `${Math.round(detail.similarContext.surfaceAccuracy * 100)}%`
                        : "Unavailable"}
                    </p>
                    <p className="mt-2 text-sm text-inkSecondary">
                      Sample {detail.similarContext.surfaceSample ?? "Unavailable"} matches
                    </p>
                  </div>
                  <div className="rounded-2xl border border-borderSubtle bg-surface2 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-inkMuted">
                      Confidence bucket
                    </p>
                    <p className="mt-2 text-lg font-semibold text-ink">
                      {detail.similarContext.confidenceBucket ?? "Unavailable"}
                    </p>
                    <p className="mt-2 text-sm text-inkSecondary">
                      Accuracy{" "}
                      {detail.similarContext.confidenceBucketAccuracy !== null &&
                      detail.similarContext.confidenceBucketAccuracy !== undefined
                        ? `${Math.round(
                            detail.similarContext.confidenceBucketAccuracy * 100,
                          )}%`
                        : "Unavailable"}{" "}
                      across {detail.similarContext.confidenceBucketSample ?? "Unavailable"} matches
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-5 text-sm leading-7 text-inkSecondary">
                  Similar-match reliability is hidden until an evaluation snapshot is available.
                </p>
              )}
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-inkMuted">
              Player comparison
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">
              Side-by-side context, including non-scoring fields
            </h2>
          </div>
          <PlayerComparison
            playerAName={match.playerA.name}
            playerBName={match.playerB.name}
            playerAId={match.playerA.id}
            playerBId={match.playerB.id}
            rows={detail.comparisonRows}
          />
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-inkMuted">
              Match projections
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">
              Expected match shape
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ProjectionCard
              label="Expected total sets"
              value={formatProjection(detail.projection.expectedTotalSets)}
              detail={`Generated by ${match.modelVersion ?? "the current model"} using the pre-match feature snapshot.`}
            />
            <ProjectionCard
              label="Expected total games"
              value={formatProjection(detail.projection.expectedTotalGames)}
              detail="Displayed with restrained precision because projections are directional, not exact outcomes."
            />
            <ProjectionCard
              label="Straight-sets chance"
              value={formatPercent(detail.projection.favoriteStraightSetsProbability)}
              detail={`${detail.favoredPlayerName} wins without a deciding set.`}
            />
            <ProjectionCard
              label="Deciding-set chance"
              value={formatPercent(detail.projection.decidingSetProbability)}
              detail="Probability that the match extends to the final set."
            />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <FormSequence
            title={`${match.playerA.name} recent form`}
            description="Last completed matches for player A, shown with opponent and surface context."
            matches={detail.playerARecentForm}
          />
          <FormSequence
            title={`${match.playerB.name} recent form`}
            description="Last completed matches for player B, using the same historical source."
            matches={detail.playerBRecentForm}
          />
          <FormSequence
            title={`${match.playerA.name} surface form`}
            description={`Most recent ${match.surface ? sentenceCase(match.surface) : "surface"} matches for player A.`}
            matches={detail.playerASurfaceForm}
          />
          <FormSequence
            title={`${match.playerB.name} surface form`}
            description={`Most recent ${match.surface ? sentenceCase(match.surface) : "surface"} matches for player B.`}
            matches={detail.playerBSurfaceForm}
          />
        </section>

        <section>
          {detail.headToHeadMatches.length > 0 ? (
            <Card className="rounded-hero p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-inkMuted">
                Head-to-head
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-ink">
                Previous meetings between these players
              </h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {detail.headToHeadMatches.map((item) => (
                  <div
                    key={item.matchId}
                    className="rounded-2xl border border-borderSubtle bg-surface2 p-4"
                  >
                    <p className="text-sm font-medium text-ink">{item.opponentName}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-inkMuted">
                      {item.tournamentName} • {sentenceCase(item.surface)} •{" "}
                      {sentenceCase(item.round)}
                    </p>
                    <p className="mt-3 text-sm text-inkSecondary">
                      Result {item.result}
                      {item.score ? ` • ${item.score}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <EmptyState
              title="No head-to-head history is available"
              description="These players do not have a prior meeting in the active historical dataset used by the MVP."
            />
          )}
        </section>
      </div>
    </AppShell>
  );
}
