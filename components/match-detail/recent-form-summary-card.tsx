import { Card } from "@/components/ui/card";
import type { MatchDetailViewModel, RecentMatchViewModel } from "@/src/lib/app-view-models";
import { cn } from "@/src/lib/cn";

function formSequence(matches: RecentMatchViewModel[]) {
  return matches.slice(0, 5).reverse();
}

function PlayerFormRow({
  name,
  matches,
}: {
  name: string;
  matches: RecentMatchViewModel[];
}) {
  const sequence = formSequence(matches);

  return (
    <div className="rounded-[18px] bg-[var(--surface-inset)] px-5 py-4">
      {sequence.length > 0 ? (
        <div className="mb-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-inkMuted">
          <span>Oldest</span>
          <span>Newest</span>
        </div>
      ) : null}
      <div className="grid grid-cols-5 gap-2">
        {sequence.length > 0 ? (
          sequence.map((match) => (
            <span
              key={`${name}-${match.matchId}`}
              className={cn(
                "inline-flex h-8 w-full items-center justify-center rounded-full px-2 text-[11px] font-semibold",
                match.result === "W"
                  ? "bg-[color:var(--accent-green-dark)] text-[var(--accent-lime)]"
                  : "bg-[rgba(110,31,37,0.72)] text-[#ff7c85]",
              )}
            >
              {match.result}
            </span>
          ))
        ) : (
          <span className="text-[13px] text-inkSecondary">No recent sample</span>
        )}
      </div>
      <p className="mt-4 text-[13px] text-inkSecondary">{name}</p>
    </div>
  );
}

export function RecentFormSummaryCard({ detail }: { detail: MatchDetailViewModel }) {
  const { match } = detail;

  return (
    <Card className="rounded-[24px] p-6 sm:p-7">
      <h2 className="text-[22px] font-semibold tracking-[-0.04em] text-ink sm:text-[24px]">
        Recent form
      </h2>
      <p className="mt-2 text-[14px] text-inkSecondary">Last five completed matches</p>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <PlayerFormRow name={match.playerA.name} matches={detail.playerARecentForm} />
        <PlayerFormRow name={match.playerB.name} matches={detail.playerBRecentForm} />
      </div>
    </Card>
  );
}
