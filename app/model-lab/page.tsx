import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { CalibrationChart } from "@/components/model/calibration-chart";
import { ModelComparisonTable } from "@/components/model/model-comparison-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import {
  getLatestModelHealthEvaluation,
  type EvaluationSegmentType,
  type SegmentComparisonType,
} from "@/src/lib/model-health";

export const dynamic = "force-dynamic";

function formatRate(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatMetric(value: number) {
  return value.toFixed(4);
}

function formatGeneratedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(value));
}

function formatDate(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function segmentLabel(segmentType: EvaluationSegmentType | SegmentComparisonType, value: string) {
  if (segmentType === "surface") {
    return `${value[0].toUpperCase()}${value.slice(1)}`;
  }

  if (segmentType === "tournament_level") {
    return value
      .split("_")
      .map((part) => (part === "atp" ? "ATP" : `${part[0].toUpperCase()}${part.slice(1)}`))
      .join(" ");
  }

  if (segmentType === "best_of") {
    return value.replace("best_of_", "Best of ");
  }

  if (segmentType === "favorite_probability_bucket") {
    return `Favorite ${value}`;
  }

  return value;
}

export default async function ModelLabPage() {
  const health = await getLatestModelHealthEvaluation();

  if (!health) {
    return (
      <AppShell breadcrumbs={[{ label: "Model Lab" }]}>
        <EmptyState
          title="No model evaluation snapshot is loaded"
          description="Run the Supabase evaluation migration and load the baseline-v5 artifacts so the internal model-health page has persisted data to read."
        />
      </AppShell>
    );
  }

  const { evaluation, comparisons, calibrationBuckets, segments, ablations, insights } = health;

  return (
    <AppShell
      breadcrumbs={[{ label: "Model Lab" }]}
      freshnessLabel={`Evaluation generated ${formatGeneratedAt(evaluation.generated_at)}`}
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="Model Lab"
          title="Quality control for the ATP prediction engine."
          description="This route is intentionally internal-facing. It tells us whether the explainable baseline deserves trust, where it is strong or weak, and whether added complexity is actually improving the probabilities."
          actions={<Badge tone="brand">{evaluation.primary_model_version}</Badge>}
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Accuracy"
            value={formatRate(evaluation.overall_accuracy)}
            detail={`Sample of ${evaluation.sample_match_count} settled ATP matches`}
          />
          <MetricCard
            label="Log loss"
            value={formatMetric(evaluation.overall_log_loss)}
            detail="Primary probability-quality metric. Lower is better."
          />
          <MetricCard
            label="Brier score"
            value={formatMetric(evaluation.overall_brier_score)}
            detail="Magnitude of probability error. Lower is better."
          />
          <MetricCard
            label="Calibration error"
            value={formatMetric(evaluation.overall_calibration_error)}
            detail="Gap between model probability and realized outcomes."
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Card className="rounded-hero p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-inkMuted">
              Run context
            </p>
            <div className="mt-5 space-y-3 text-sm leading-7 text-inkSecondary">
              <p>
                Generated <span className="text-ink">{formatGeneratedAt(evaluation.generated_at)}</span>
              </p>
              <p>
                Sample window{" "}
                <span className="text-ink">
                  {formatDate(evaluation.sample_date_from)} to {formatDate(evaluation.sample_date_to)}
                </span>
              </p>
              <p>
                Best accuracy model{" "}
                <span className="text-ink">{evaluation.best_accuracy_model_version}</span>
              </p>
              <p>
                Best log loss model{" "}
                <span className="text-ink">{evaluation.best_log_loss_model_version}</span>
              </p>
            </div>
          </Card>

          <Card className="rounded-hero p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-inkMuted">
              Current read
            </p>
            <div className="mt-5 space-y-3 text-sm leading-7 text-inkSecondary">
              <p>
                Strongest surface{" "}
                <span className="text-ink">
                  {insights.strongestSurface
                    ? `${segmentLabel("surface", insights.strongestSurface.segment_key)} (${formatRate(
                        insights.strongestSurface.accuracy,
                      )})`
                    : "Unavailable"}
                </span>
              </p>
              <p>
                Weakest surface{" "}
                <span className="text-ink">
                  {insights.weakestSurface
                    ? `${segmentLabel("surface", insights.weakestSurface.segment_key)} (${formatRate(
                        insights.weakestSurface.accuracy,
                      )})`
                    : "Unavailable"}
                </span>
              </p>
              <p>
                Best tournament level{" "}
                <span className="text-ink">
                  {insights.bestTournamentLevel
                    ? `${segmentLabel(
                        "tournament_level",
                        insights.bestTournamentLevel.segment_key,
                      )} (${formatRate(insights.bestTournamentLevel.accuracy)})`
                    : "Unavailable"}
                </span>
              </p>
              <p>
                Most important factor{" "}
                <span className="text-ink">
                  {insights.mostImportantFactor
                    ? insights.mostImportantFactor.omitted_label
                    : "Unavailable"}
                </span>
              </p>
            </div>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <CalibrationChart
            rows={calibrationBuckets.map((bucket) => ({
              bucketLabel: bucket.bucket_label,
              averagePredictedWinProbability: bucket.average_predicted_win_probability,
              actualFavoriteWinRate: bucket.actual_favorite_win_rate,
              matchCount: bucket.match_count,
            }))}
          />
          <ModelComparisonTable comparisons={comparisons} evaluation={evaluation} />
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          {(["surface", "tournament_level", "best_of"] as const).map((segmentType) => (
            <Card key={segmentType} className="rounded-hero p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-inkMuted">
                {segmentLabel(segmentType, segmentType)}
              </p>
              <div className="mt-5 space-y-3">
                {segments[segmentType].slice(0, 6).map((segment) => (
                  <div
                    key={`${segmentType}-${segment.segment_key}`}
                    className="rounded-2xl border border-borderSubtle bg-surface2 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-ink">
                        {segmentLabel(segmentType, segment.segment_key)}
                      </p>
                      <p className="numeric text-sm text-inkSecondary">
                        {segment.match_count}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-inkSecondary">
                      Accuracy {formatRate(segment.accuracy)} • Log loss {formatMetric(segment.log_loss)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </section>

        <section>
          <Card className="rounded-hero p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-inkMuted">
                  Feature ablation
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-ink">
                  What drops performance when removed
                </h2>
              </div>
              <p className="text-sm text-inkSecondary">
                Positive deltas indicate a worse model after removing the factor.
              </p>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
                <thead className="text-inkMuted">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Removed factor</th>
                    <th className="px-4 py-2 font-semibold">Accuracy delta</th>
                    <th className="px-4 py-2 font-semibold">Log loss delta</th>
                    <th className="px-4 py-2 font-semibold">Brier delta</th>
                    <th className="px-4 py-2 font-semibold">Calibration delta</th>
                  </tr>
                </thead>
                <tbody>
                  {ablations.map((row) => (
                    <tr key={row.omitted_factor} className="bg-surface2">
                      <td className="rounded-l-2xl px-4 py-3 font-medium text-ink">
                        {row.omitted_label}
                      </td>
                      <td className="numeric px-4 py-3 text-inkSecondary">
                        {row.accuracy_delta_vs_primary.toFixed(4)}
                      </td>
                      <td className="numeric px-4 py-3 text-inkSecondary">
                        {row.log_loss_delta_vs_primary.toFixed(4)}
                      </td>
                      <td className="numeric px-4 py-3 text-inkSecondary">
                        {row.brier_delta_vs_primary.toFixed(4)}
                      </td>
                      <td className="numeric rounded-r-2xl px-4 py-3 text-inkSecondary">
                        {row.calibration_delta_vs_primary.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
