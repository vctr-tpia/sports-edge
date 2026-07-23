import { Card } from "@/components/ui/card";
import type { MatchDetailViewModel } from "@/src/lib/app-view-models";
import { cn } from "@/src/lib/cn";
import {
  factorStrengthSummary,
  formatFactorDelta,
  playerSurname,
} from "@/components/match-detail/helpers";

export function FactorBreakdownCard({ detail }: { detail: MatchDetailViewModel }) {
  const factors = detail.factors.slice(0, 5);
  const counterSignal = detail.counterFactors[0];
  const favoredSurname = playerSurname(detail.favoredPlayerName);

  return (
    <Card className="h-full rounded-[24px] p-6 sm:p-7">
      <h2 className="text-[22px] font-semibold tracking-[-0.04em] text-ink sm:text-[24px]">
        Why the model favors {favoredSurname}
      </h2>
      <p className="mt-2 text-[14px] text-inkSecondary">
        The model agrees strongly, but not unanimously.
      </p>

      <div className="mt-6 space-y-2">
        {factors.map((factor) => {
          const supportsFavorite = factor.favoredPlayerId === detail.match.favoredPlayerId;
          const tone = !factor.favoredPlayerId
            ? "text-inkSecondary"
            : supportsFavorite
              ? factor.label.toLowerCase().includes("elo")
                ? "text-[var(--accent-lime)]"
                : "text-[var(--accent-cyan)]"
              : "text-warning";

          return (
            <div
              key={factor.key}
              className="grid grid-cols-[minmax(120px,148px)_minmax(0,1fr)_auto] items-center gap-3 border-b border-white/5 py-4 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="text-[15px] font-medium text-ink">{factor.label}</p>
              </div>

              <div className="min-w-0">
                <p className="truncate text-[12px] text-inkMuted">{factorStrengthSummary(factor)}</p>
              </div>

              <p className={cn("text-[16px] font-semibold sm:text-right", tone)}>
                {formatFactorDelta(detail, factor)}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-[18px] bg-[var(--surface-inset)] px-5 py-4">
        <p className="text-[13px] text-warning">
          Counter-signal:{" "}
          {counterSignal
            ? `${playerSurname(counterSignal.favoredPlayerName ?? detail.underdogPlayerName)} still carries ${counterSignal.label.toLowerCase()}.`
            : "No major opposing factor currently outweighs the favorite's lead."}
        </p>
      </div>
    </Card>
  );
}
