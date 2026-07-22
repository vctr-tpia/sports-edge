import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ConfidenceBadge } from "@/components/predictions/confidence-badge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getPredictionsDirectoryViewModel } from "@/src/lib/app-view-models";
import { cn } from "@/src/lib/cn";

type SearchValue = string | string[] | undefined;

function readParam(value: SearchValue) {
  return Array.isArray(value) ? value[0] : value;
}

function buildHref(
  current: Record<string, SearchValue>,
  key: string,
  value: string,
) {
  const params = new URLSearchParams();

  for (const [entryKey, entryValue] of Object.entries(current)) {
    const first = readParam(entryValue);
    if (!first || entryKey === key) {
      continue;
    }
    params.set(entryKey, first);
  }

  if (value !== "all") {
    params.set(key, value);
  }

  const query = params.toString();
  return query ? `/predictions?${query}` : "/predictions";
}

function FilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm font-medium transition",
        active
          ? "border-brand/25 bg-brandSoft text-ink"
          : "border-borderSubtle bg-surface2 text-inkSecondary hover:text-ink",
      )}
    >
      {label}
    </Link>
  );
}

function sentenceCase(value?: string | null) {
  if (!value) {
    return "Unavailable";
  }

  return value
    .split("_")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function formatProbability(value?: number | null) {
  if (value === null || value === undefined) {
    return "Unavailable";
  }

  return `${Math.round(value * 100)}%`;
}

export default async function PredictionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, SearchValue>>;
}) {
  const params = await searchParams;
  const filters = {
    query: readParam(params.query),
    surface: readParam(params.surface),
    confidence: readParam(params.confidence),
  };

  const directory = await getPredictionsDirectoryViewModel(filters);

  return (
    <AppShell
      breadcrumbs={[{ label: "Predictions" }]}
      freshnessLabel={directory.freshnessLabel}
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="Predictions"
          title="One view for current picks and settled benchmark examples."
          description="This route is closer to an internal prediction log than a sportsbook board. It keeps model version, confidence, status, and match context visible so we can compare live selections with historical outcomes."
        />

        <Card className="rounded-hero p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-inkMuted">
                Surface
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["all", "hard", "clay", "grass"].map((surface) => (
                  <FilterChip
                    key={surface}
                    href={buildHref(params, "surface", surface)}
                    label={sentenceCase(surface)}
                    active={(filters.surface ?? "all") === surface}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-inkMuted">
                Confidence
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["all", "very_high", "high", "moderate", "low"].map((bucket) => (
                  <FilterChip
                    key={bucket}
                    href={buildHref(params, "confidence", bucket)}
                    label={sentenceCase(bucket)}
                    active={(filters.confidence ?? "all") === bucket}
                  />
                ))}
              </div>
            </div>
          </div>
        </Card>

        {directory.predictions.length > 0 ? (
          <>
            <Card className="hidden rounded-hero p-4 lg:block">
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
                  <thead className="text-inkMuted">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Match</th>
                      <th className="px-4 py-2 font-semibold">Tournament</th>
                      <th className="px-4 py-2 font-semibold">Surface</th>
                      <th className="px-4 py-2 font-semibold">Model pick</th>
                      <th className="px-4 py-2 font-semibold">Probability</th>
                      <th className="px-4 py-2 font-semibold">Confidence</th>
                      <th className="px-4 py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {directory.predictions.map((prediction) => {
                      const favoriteName =
                        prediction.favoredPlayerId === prediction.playerA.id
                          ? prediction.playerA.name
                          : prediction.playerB.name;
                      const favoriteProbability =
                        prediction.favoredPlayerId === prediction.playerA.id
                          ? prediction.playerAProbability
                          : prediction.playerBProbability;

                      return (
                        <tr key={prediction.matchId} className="bg-surface2">
                          <td className="rounded-l-2xl px-4 py-3">
                            <Link
                              href={`/match/${prediction.matchId}`}
                              className="font-medium text-ink transition hover:text-brand"
                            >
                              {prediction.playerA.name} vs {prediction.playerB.name}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-inkSecondary">
                            {prediction.tournamentName}
                          </td>
                          <td className="px-4 py-3 text-inkSecondary">
                            {sentenceCase(prediction.surface)}
                          </td>
                          <td className="px-4 py-3 text-inkSecondary">{favoriteName}</td>
                          <td className="numeric px-4 py-3 text-inkSecondary">
                            {formatProbability(favoriteProbability)}
                          </td>
                          <td className="px-4 py-3">
                            <ConfidenceBadge
                              label={prediction.confidenceLabel}
                              score={prediction.confidenceScore}
                            />
                          </td>
                          <td className="rounded-r-2xl px-4 py-3">
                            <Badge tone={prediction.status === "settled" ? "neutral" : "brand"}>
                              {sentenceCase(prediction.status)}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="grid gap-4 lg:hidden">
              {directory.predictions.map((prediction) => {
                const favoriteName =
                  prediction.favoredPlayerId === prediction.playerA.id
                    ? prediction.playerA.name
                    : prediction.playerB.name;
                const favoriteProbability =
                  prediction.favoredPlayerId === prediction.playerA.id
                    ? prediction.playerAProbability
                    : prediction.playerBProbability;

                return (
                  <Card key={prediction.matchId} className="rounded-hero p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/match/${prediction.matchId}`}
                          className="text-lg font-semibold text-ink transition hover:text-brand"
                        >
                          {prediction.playerA.name} vs {prediction.playerB.name}
                        </Link>
                        <p className="mt-2 text-sm text-inkSecondary">
                          {prediction.tournamentName} • {sentenceCase(prediction.surface)}
                        </p>
                      </div>
                      <Badge tone={prediction.status === "settled" ? "neutral" : "brand"}>
                        {sentenceCase(prediction.status)}
                      </Badge>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge tone="neutral">Pick {favoriteName}</Badge>
                      <Badge tone="neutral">
                        Probability {formatProbability(favoriteProbability)}
                      </Badge>
                      <ConfidenceBadge
                        label={prediction.confidenceLabel}
                        score={prediction.confidenceScore}
                      />
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        ) : (
          <EmptyState
            title="No predictions fit the active filters"
            description="Try broadening the surface or confidence filters to bring predictions back into the directory."
          />
        )}
      </div>
    </AppShell>
  );
}
