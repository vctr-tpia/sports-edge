import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { MatchCard } from "@/components/matches/match-card";
import { EmptyState } from "@/components/ui/empty-state";
import { getUpcomingDirectoryViewModel, type MatchPredictionViewModel } from "@/src/lib/app-view-models";
import { cn } from "@/src/lib/cn";

type SearchValue = string | string[] | undefined;

const MATCHES_TIME_ZONE = "America/Los_Angeles";
const REFERENCE_TODAY = new Date("2026-07-23T12:00:00-07:00");

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

function buildResetHref(current: Record<string, SearchValue>) {
  const params = new URLSearchParams();
  const query = readParam(current.query);

  if (query) {
    params.set("query", query);
  }

  const value = params.toString();
  return value ? `/matches?${value}` : "/matches";
}

function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function zonedDateKey(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MATCHES_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function matchDateKey(match: MatchPredictionViewModel) {
  if (match.scheduledAt) {
    const parsed = new Date(match.scheduledAt);
    if (!Number.isNaN(parsed.getTime())) {
      return zonedDateKey(parsed);
    }
  }

  return match.matchDate;
}

function formatDateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1, 12)));
}

function buildRelativeDateLabel(dateKey: string) {
  const todayKey = zonedDateKey(REFERENCE_TODAY);
  const tomorrowKey = zonedDateKey(addDays(REFERENCE_TODAY, 1));

  if (dateKey === todayKey) {
    return "Today";
  }

  if (dateKey === tomorrowKey) {
    return "Tomorrow";
  }

  return formatDateLabel(dateKey);
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

function DatePill({
  href,
  label,
  sublabel,
  active,
}: {
  href: string;
  label: string;
  sublabel: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-[13px] font-medium transition",
        active
          ? "border-[color:var(--border-accent)] bg-[rgba(20,122,229,0.12)] text-ink"
          : "border-borderSubtle bg-surface2 text-inkSecondary hover:border-[color:var(--border-accent)]/60 hover:text-ink",
      )}
    >
      <span>{label}</span>
      <span className="mx-2 text-inkMuted">·</span>
      <span className="text-[12px] text-inkMuted">
        {sublabel}
      </span>
    </Link>
  );
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
        "inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-[13px] font-medium transition",
        active
          ? "border-[color:var(--border-accent)] bg-[rgba(20,122,229,0.12)] text-ink"
          : "border-borderSubtle bg-surface2 text-inkSecondary hover:border-[color:var(--border-accent)]/60 hover:text-ink",
      )}
    >
      {label}
    </Link>
  );
}

function DesktopMatchesHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="pb-8 pt-12">
      <div className="max-w-[760px]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">Matches</p>
        <h1 className="mt-5 text-[52px] font-bold leading-[0.98] tracking-[-0.055em] text-ink">
          {title}
        </h1>
        <p className="mt-4 max-w-[700px] text-[14px] leading-7 text-inkSecondary">
          {description}
        </p>
      </div>
    </section>
  );
}

function MobileMatchesHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="pb-6 pt-3">
      <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-brand">Matches</p>
      <h1 className="mt-3 max-w-[320px] text-[36px] font-bold leading-[1] tracking-[-0.06em] text-ink">{title}</h1>
      <p className="mt-4 max-w-[320px] text-[15px] leading-7 text-inkSecondary">
        {description}
      </p>
    </section>
  );
}

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, SearchValue>>;
}) {
  const params = await searchParams;
  const filters = {
    date: readParam(params.date),
    query: readParam(params.query),
    surface: readParam(params.surface),
    confidence: readParam(params.confidence),
    tournament: readParam(params.tournament),
    sort: readParam(params.sort),
  };

  let directory:
    | Awaited<ReturnType<typeof getUpcomingDirectoryViewModel>>
    | null = null;

  try {
    directory = await getUpcomingDirectoryViewModel({
      query: filters.query,
      surface: filters.surface,
      confidence: filters.confidence,
      tournament: filters.tournament,
      sort: filters.sort,
    });
  } catch {
    directory = null;
  }

  if (!directory) {
    return (
      <AppShell breadcrumbs={[{ label: "Matches" }]}>
        <EmptyState
          title="The Matches browser is temporarily unavailable"
          description="We could not load the current ATP slate from the local prediction dataset. Try again after the next successful refresh."
        />
      </AppShell>
    );
  }

  const availableDateKeys = [...new Set(directory.matches.map(matchDateKey))].sort((left, right) =>
    left.localeCompare(right),
  );
  const defaultDateKey = zonedDateKey(addDays(REFERENCE_TODAY, 1));
  const selectedDate = filters.date ?? (availableDateKeys.includes(defaultDateKey) ? defaultDateKey : "all");
  const usingDefaultDate = !filters.date && selectedDate === defaultDateKey;
  const filteredMatches =
    selectedDate === "all"
      ? directory.matches
      : directory.matches.filter((match) => matchDateKey(match) === selectedDate);

  const groupedMatches = filteredMatches.reduce<Array<{ title: string }>>((groups, match) => {
    if (!groups.some((group) => group.title === match.tournamentName)) {
      groups.push({ title: match.tournamentName });
    }
    return groups;
  }, []);

  const hasActiveFilters =
    (selectedDate !== "all" && !usingDefaultDate) ||
    Boolean(filters.query?.trim()) ||
    (filters.surface ?? "all") !== "all" ||
    (filters.confidence ?? "all") !== "all" ||
    (filters.tournament ?? "all") !== "all" ||
    (filters.sort ?? "time") !== "time";

  const activeSummary =
    selectedDate !== "all"
      ? `${buildRelativeDateLabel(selectedDate)} · ${filteredMatches.length} matches`
      : `${filteredMatches.length} matches across ${groupedMatches.length} tournament${groupedMatches.length === 1 ? "" : "s"}`;

  const featuredMatch =
    [...filteredMatches]
      .filter(
        (match) =>
          typeof match.playerAProbability === "number" &&
          typeof match.playerBProbability === "number" &&
          Boolean(match.favoredPlayerId),
      )
      .sort((left, right) => {
        const confidenceGap = (right.confidenceScore ?? -1) - (left.confidenceScore ?? -1);
        if (confidenceGap !== 0) {
          return confidenceGap;
        }

        const leftProbability = Math.max(left.playerAProbability ?? 0, left.playerBProbability ?? 0);
        const rightProbability = Math.max(right.playerAProbability ?? 0, right.playerBProbability ?? 0);
        return rightProbability - leftProbability;
      })[0] ??
    filteredMatches[0] ??
    null;
  const remainingMatches = featuredMatch
    ? filteredMatches.filter((match) => match.matchId !== featuredMatch.matchId)
    : filteredMatches;

  const headingTitle =
    selectedDate === zonedDateKey(REFERENCE_TODAY)
      ? "Today’s ATP slate"
      : selectedDate === zonedDateKey(addDays(REFERENCE_TODAY, 1))
        ? "Tomorrow’s ATP slate"
        : selectedDate !== "all"
          ? `${buildRelativeDateLabel(selectedDate)} ATP slate`
          : "ATP slate";

  const headingDescription =
    hasActiveFilters && selectedDate === "all"
      ? "Browse model predictions, compare confidence, and open the full explanation."
      : "Browse model predictions, compare confidence, and open the full explanation.";

  return (
    <AppShell
      breadcrumbs={[{ label: "Matches" }]}
      freshnessLabel={directory.freshnessLabel}
      freshnessTone={directory.freshnessTone}
    >
      <div className="hidden min-[768px]:block">
        <DesktopMatchesHeader
          title={headingTitle}
          description={headingDescription}
        />
      </div>

      <div className="min-[768px]:hidden">
        <MobileMatchesHeader
          title={headingTitle}
          description={headingDescription}
        />
      </div>

      <section className="space-y-5">
        <form action="/matches" className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="xl:flex-1">
              <input
                type="search"
                name="query"
                defaultValue={filters.query ?? ""}
                placeholder="Search player or tournament..."
                className="h-[52px] w-full rounded-[18px] border border-borderSubtle bg-[rgba(8,28,42,0.88)] px-4 text-[15px] text-ink placeholder:text-inkMuted shadow-panel outline-none transition focus:border-[color:var(--border-accent)]"
              />
              {selectedDate !== "all" ? <input type="hidden" name="date" value={selectedDate} /> : null}
              {(filters.tournament ?? "all") !== "all" ? (
                <input type="hidden" name="tournament" value={filters.tournament} />
              ) : null}
              {(filters.surface ?? "all") !== "all" ? (
                <input type="hidden" name="surface" value={filters.surface} />
              ) : null}
              {(filters.confidence ?? "all") !== "all" ? (
                <input type="hidden" name="confidence" value={filters.confidence} />
              ) : null}
              {(filters.sort ?? "time") !== "time" ? (
                <input type="hidden" name="sort" value={filters.sort} />
              ) : null}
            </div>
            <button type="submit" className="hidden" aria-hidden="true" />
            <div className="flex flex-wrap gap-3">
              <FilterChip
                href={buildHref(params, "tournament", "all")}
                label="All tournaments"
                active={(filters.tournament ?? "all") === "all"}
              />
              <FilterChip
                href={buildHref(params, "surface", "all")}
                label="All surfaces"
                active={(filters.surface ?? "all") === "all"}
              />
              <FilterChip
                href={buildHref(params, "confidence", "high")}
                label="High+ confidence"
                active={(filters.confidence ?? "all") === "high"}
              />
              <span className="inline-flex min-h-11 items-center rounded-full border border-transparent bg-[linear-gradient(90deg,var(--accent-blue)_0%,#2a88f0_100%)] px-4 py-2 text-[13px] font-medium text-white">
                Upcoming
              </span>
              <FilterChip
                href={buildHref(params, "sort", (filters.sort ?? "time") === "time" ? "confidence" : "time")}
                label="Sort ↕"
                active={(filters.sort ?? "time") !== "time"}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 overflow-x-auto pb-1">
            <DatePill
              href={buildHref(params, "date", "all")}
              label="All dates"
              sublabel="Entire slate"
              active={selectedDate === "all"}
            />
            {availableDateKeys.map((dateKey) => (
              <DatePill
                key={dateKey}
                href={buildHref(params, "date", dateKey)}
                label={buildRelativeDateLabel(dateKey)}
                sublabel={formatDateLabel(dateKey)}
                active={selectedDate === dateKey}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <p className="text-[14px] text-inkSecondary">{activeSummary}</p>
            {filters.confidence === "high" ? (
              <p className="text-[14px] text-inkMuted">
                Showing predictions with confidence of High or above
              </p>
            ) : null}
            {hasActiveFilters ? (
              <Link
                href={buildResetHref(params)}
                className="text-[14px] text-inkSecondary transition hover:text-ink"
              >
                Reset filters
              </Link>
            ) : null}
          </div>
        </form>
      </section>

      <div className="mt-6 space-y-6 pb-24 min-[768px]:pb-10">
        {filteredMatches.length > 0 ? (
          <>
            {featuredMatch ? <MatchCard match={featuredMatch} variant="featured" /> : null}
            <div className="space-y-4">
              {remainingMatches.map((match) => (
                <MatchCard key={match.matchId} match={match} variant="row" />
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            title={
              hasActiveFilters
                ? "No matches fit the current filters"
                : "No upcoming ATP matches are currently loaded"
            }
            description={
              hasActiveFilters
                ? "Try clearing one or more filters to widen the slate."
                : "The next successful ATP refresh will repopulate the match browser."
            }
          />
        )}
      </div>
    </AppShell>
  );
}
