import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { MatchCard } from "@/components/matches/match-card";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getUpcomingDirectoryViewModel } from "@/src/lib/app-view-models";
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
  return query ? `/matches?${query}` : "/matches";
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

function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, SearchValue>>;
}) {
  const params = await searchParams;
  const filters = {
    query: readParam(params.query),
    surface: readParam(params.surface),
    confidence: readParam(params.confidence),
    tournament: readParam(params.tournament),
    sort: readParam(params.sort),
  };

  const directory = await getUpcomingDirectoryViewModel(filters);

  return (
    <AppShell
      breadcrumbs={[{ label: "Matches" }]}
      freshnessLabel={directory.freshnessLabel}
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="Matches"
          title="Scan upcoming ATP fixtures without losing the analytical thread."
          description="The listing view stays intentionally compact. It highlights the prediction state, favorite, confidence, and top explanatory factor, while pushing deeper context into the dedicated match analysis page."
        />

        <Card className="rounded-hero p-5">
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-inkMuted">
                Surface
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["all", "hard", "clay", "grass"].map((surface) => (
                  <FilterChip
                    key={surface}
                    href={buildHref(params, "surface", surface)}
                    label={titleCase(surface)}
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
                    label={titleCase(bucket)}
                    active={(filters.confidence ?? "all") === bucket}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-inkMuted">
                Sort
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  ["time", "Match time"],
                  ["confidence", "Highest confidence"],
                  ["closest", "Closest matchup"],
                  ["ranking", "Ranking"],
                  ["tournament", "Tournament"],
                ].map(([value, label]) => (
                  <FilterChip
                    key={value}
                    href={buildHref(params, "sort", value)}
                    label={label}
                    active={(filters.sort ?? "time") === value}
                  />
                ))}
              </div>
            </div>
          </div>
        </Card>

        {directory.tournaments.length > 0 ? (
          <Card className="rounded-hero p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-inkMuted">
              Tournament filter
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <FilterChip
                href={buildHref(params, "tournament", "all")}
                label="All tournaments"
                active={(filters.tournament ?? "all") === "all"}
              />
              {directory.tournaments.slice(0, 12).map((tournament) => (
                <FilterChip
                  key={tournament}
                  href={buildHref(params, "tournament", tournament)}
                  label={tournament}
                  active={filters.tournament === tournament}
                />
              ))}
            </div>
          </Card>
        ) : null}

        {directory.matches.length > 0 ? (
          <div className="grid gap-5 xl:grid-cols-2">
            {directory.matches.map((match) => (
              <MatchCard key={match.matchId} match={match} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No upcoming matches fit the current filters"
            description="Try clearing one of the active filters or wait for the next ATP refresh to expand the slate."
          />
        )}
      </div>
    </AppShell>
  );
}
