import Link from "next/link";
import type { RecentMatchViewModel } from "@/src/lib/app-view-models";
import { Card } from "@/components/ui/card";
import { cn } from "@/src/lib/cn";

export function FormSequence({
  title,
  description,
  matches,
}: {
  title: string;
  description: string;
  matches: RecentMatchViewModel[];
}) {
  return (
    <Card className="rounded-panel p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-inkMuted">{title}</p>
      <p className="mt-2 text-sm leading-6 text-inkSecondary">{description}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {matches.map((match) => (
          <span
            key={`${title}-${match.matchId}`}
            className={cn(
              "inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-xs font-semibold",
              match.result === "W"
                ? "border-court/20 bg-court/12 text-court"
                : "border-danger/20 bg-danger/12 text-danger",
            )}
          >
            {match.result}
          </span>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {matches.map((match) => (
          <Link
            key={match.matchId}
            href={`/match/${match.matchId}`}
            className="block rounded-2xl border border-borderSubtle bg-surface2 p-4 transition hover:border-borderStrong"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-ink">{match.opponentName}</p>
              <span className={cn("text-xs font-semibold", match.result === "W" ? "text-court" : "text-danger")}>
                {match.result}
              </span>
            </div>
            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-inkMuted">
              {match.tournamentName} • {match.surface} • {match.round}
            </p>
          </Link>
        ))}
      </div>
    </Card>
  );
}
