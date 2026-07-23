import { Card } from "@/components/ui/card";
import type { MatchDetailViewModel } from "@/src/lib/app-view-models";
import { cn } from "@/src/lib/cn";
import { parseComparisonValue } from "@/components/match-detail/helpers";

function comparisonWidths(label: string, playerAValue: string, playerBValue: string) {
  const a = parseComparisonValue(label, playerAValue);
  const b = parseComparisonValue(label, playerBValue);

  if (a === null || b === null) {
    return { playerA: 20, playerB: 20 };
  }

  const total = a + b;
  if (total <= 0) {
    return { playerA: 20, playerB: 20 };
  }

  return {
    playerA: Math.max(8, Math.min(100, Math.round((a / total) * 100))),
    playerB: Math.max(8, Math.min(100, Math.round((b / total) * 100))),
  };
}

export function PlayerComparisonCard({ detail }: { detail: MatchDetailViewModel }) {
  const { match } = detail;

  return (
    <Card className="rounded-[24px] p-6 sm:p-7">
      <h2 className="text-[22px] font-semibold tracking-[-0.04em] text-ink sm:text-[24px]">
        Player comparison
      </h2>
      <p className="mt-2 text-[14px] text-inkSecondary">
        Current pre-match snapshot
      </p>

      <div className="mt-6 hidden items-end gap-3 md:grid md:grid-cols-[150px_1fr_140px_1fr_150px]">
        <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-cyan)]">
          {match.playerA.name}
        </div>
        <div />
        <div />
        <div />
        <div className="text-right text-[12px] font-semibold uppercase tracking-[0.12em] text-inkMuted">
          {match.playerB.name}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {detail.comparisonRows.map((row) => (
          <div
            key={row.label}
            className="grid gap-3 border-b border-white/5 py-4 last:border-b-0 md:grid-cols-[150px_1fr_140px_1fr_150px] md:items-center"
          >
            <div
              className={cn(
                "text-[15px] font-medium md:text-right",
                row.favoredPlayerId === match.playerA.id ? "text-ink" : "text-inkSecondary",
              )}
            >
              {row.playerAValue}
            </div>

            <div className="hidden md:block">
              <div className="h-2 rounded-full bg-[var(--progress-track)]">
                <div
                  className="h-full rounded-full shadow-[0_0_14px_rgba(46,194,255,0.16)]"
                  style={{
                    background:
                      row.favoredPlayerId === match.playerA.id ? "var(--progress-fill)" : "#4e5b67",
                    width: `${comparisonWidths(row.label, row.playerAValue, row.playerBValue).playerA}%`,
                  }}
                />
              </div>
            </div>

            <div className="px-2 text-left md:text-center">
              <p className="text-[11px] font-medium text-inkMuted md:text-[13px]">{row.label}</p>
            </div>

            <div className="hidden md:block">
              <div className="h-2 rounded-full bg-[var(--progress-track)]">
                <div
                  className="h-full rounded-full shadow-[0_0_14px_rgba(46,194,255,0.16)]"
                  style={{
                    background: row.favoredPlayerId === match.playerB.id ? "var(--progress-fill)" : "#4e5b67",
                    width: `${comparisonWidths(row.label, row.playerAValue, row.playerBValue).playerB}%`,
                  }}
                />
              </div>
            </div>

              <div
                className={cn(
                  "text-[15px] font-medium md:text-right",
                  row.favoredPlayerId === match.playerB.id ? "text-ink" : "text-inkSecondary",
                )}
              >
                {row.playerBValue}
              </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
