import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { RecentMatchViewModel } from "@/src/lib/app-view-models";
import { cn } from "@/src/lib/cn";
import { sentenceCase } from "@/components/match-detail/helpers";

export function HistoryCard({
  eyebrow,
  title,
  description,
  matches,
  emptyTitle,
}: {
  eyebrow: string;
  title: string;
  description: string;
  matches: RecentMatchViewModel[];
  emptyTitle: string;
}) {
  return (
    <Card className="rounded-[24px] p-6 sm:p-7">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">{eyebrow}</p>
      <h2 className="mt-3 text-[30px] font-semibold leading-[1.02] tracking-[-0.05em] text-ink">
        {title}
      </h2>
      <p className="mt-3 text-[14px] leading-7 text-inkSecondary">{description}</p>

      {matches.length > 0 ? (
        <>
          <div className="mt-6 flex flex-wrap gap-2">
            {matches.map((match) => (
              <span
                key={`${title}-${match.matchId}-pill`}
                className={cn(
                  "inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-[12px] font-semibold",
                  match.result === "W"
                    ? "border-[color:var(--accent-lime)] bg-[color:var(--accent-green-dark)] text-[var(--accent-lime)]"
                    : "border-warning/30 bg-warning/10 text-warning",
                )}
              >
                {match.result}
              </span>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            {matches.map((match) => (
              <Link
                key={match.matchId}
                href={`/match/${match.matchId}`}
                className="block rounded-[18px] bg-[var(--surface-inset)] px-5 py-4 transition hover:border-[color:var(--border-accent)] hover:bg-[rgba(255,255,255,0.02)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[16px] font-medium text-ink">{match.opponentName}</p>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-inkMuted">
                      {match.tournamentName} · {sentenceCase(match.surface)} · {sentenceCase(match.round)}
                    </p>
                    <p className="mt-2 text-[13px] text-inkSecondary">
                      {match.date}
                      {match.score ? ` · ${match.score}` : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-[14px] font-semibold",
                      match.result === "W" ? "text-[var(--accent-lime)]" : "text-warning",
                    )}
                  >
                    {match.result}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-[18px] bg-[var(--surface-inset)] px-5 py-5">
          <p className="text-[16px] font-medium text-ink">{emptyTitle}</p>
          <p className="mt-2 text-[14px] leading-6 text-inkSecondary">
            No relevant matches are available inside the active historical ATP dataset for this view.
          </p>
        </div>
      )}
    </Card>
  );
}
