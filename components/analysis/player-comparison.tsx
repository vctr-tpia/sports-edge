import type { ComparisonRowViewModel } from "@/src/lib/app-view-models";
import { Card } from "@/components/ui/card";
import { cn } from "@/src/lib/cn";

export function PlayerComparison({
  playerAName,
  playerBName,
  rows,
  playerAId,
  playerBId,
}: {
  playerAName: string;
  playerBName: string;
  playerAId: string;
  playerBId: string;
  rows: ComparisonRowViewModel[];
}) {
  return (
    <Card className="rounded-hero p-6">
      <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr]">
        <div className="text-sm font-medium text-ink">{playerAName}</div>
        <div className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-inkMuted">
          Comparison
        </div>
        <div className="text-right text-sm font-medium text-ink">{playerBName}</div>
      </div>

      <div className="mt-5 space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="rounded-2xl border border-borderSubtle bg-surface2 p-4">
            <div className="grid items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
              <div className={cn("numeric text-sm", row.favoredPlayerId === playerAId ? "text-ink" : "text-inkSecondary")}>
                {row.playerAValue}
              </div>
              <div className="text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-inkMuted">{row.label}</p>
                {row.note ? <p className="mt-1 text-[11px] leading-5 text-inkMuted">{row.note}</p> : null}
              </div>
              <div className={cn("numeric text-right text-sm", row.favoredPlayerId === playerBId ? "text-ink" : "text-inkSecondary")}>
                {row.playerBValue}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
