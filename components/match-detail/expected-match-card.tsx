import { Card } from "@/components/ui/card";
import type { MatchDetailViewModel } from "@/src/lib/app-view-models";
import { formatMetric, formatPercent } from "@/components/match-detail/helpers";

const metricCards = [
  { key: "sets", label: "Expected sets", field: "expectedTotalSets" as const, formatter: formatMetric },
  { key: "games", label: "Expected games", field: "expectedTotalGames" as const, formatter: formatMetric },
  {
    key: "straight",
    label: "Straight sets",
    field: "favoriteStraightSetsProbability" as const,
    formatter: formatPercent,
  },
  {
    key: "decider",
    label: "Deciding set",
    field: "decidingSetProbability" as const,
    formatter: formatPercent,
  },
];

export function ExpectedMatchCard({ detail }: { detail: MatchDetailViewModel }) {
  return (
    <Card className="h-full rounded-[24px] p-6 sm:p-7">
      <h2 className="text-[22px] font-semibold tracking-[-0.04em] text-ink sm:text-[24px]">
        Expected match
      </h2>
      <p className="mt-2 text-[14px] text-inkSecondary">
        Projected shape, not a guaranteed score.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {metricCards.map((metric) => (
          <div key={metric.key} className="rounded-[18px] bg-[var(--surface-inset)] px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-inkMuted">
              {metric.label}
            </p>
            <p className="numeric mt-4 text-[2.4rem] font-semibold leading-none tracking-[-0.05em] text-ink">
              {metric.formatter(detail.projection[metric.field])}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
