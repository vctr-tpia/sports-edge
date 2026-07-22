import type { MatchDetailViewModel } from "@/src/lib/app-view-models";
import { Card } from "@/components/ui/card";

export function FactorAgreement({ detail }: { detail: MatchDetailViewModel }) {
  return (
    <Card className="rounded-panel p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-inkMuted">
        Factor agreement
      </p>
      <h3 className="mt-3 text-xl font-semibold text-ink">
        {detail.factorAgreement.favoredPlayerCount} of {detail.factors.length} signals favor{" "}
        {detail.favoredPlayerName}
      </h3>
      <p className="mt-3 text-sm leading-7 text-inkSecondary">
        Counter-signals do still exist, which is part of the point. The model is transparent about
        which pieces of context support the other side.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-borderSubtle bg-surface2 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-inkMuted">Favored player</p>
          <p className="numeric mt-2 text-2xl font-semibold text-ink">{detail.factorAgreement.favoredPlayerCount}</p>
        </div>
        <div className="rounded-2xl border border-borderSubtle bg-surface2 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-inkMuted">Opposing signals</p>
          <p className="numeric mt-2 text-2xl font-semibold text-ink">{detail.factorAgreement.underdogCount}</p>
        </div>
        <div className="rounded-2xl border border-borderSubtle bg-surface2 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-inkMuted">Neutral</p>
          <p className="numeric mt-2 text-2xl font-semibold text-ink">{detail.factorAgreement.neutralCount}</p>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {detail.counterFactors.slice(0, 3).map((factor) => (
          <p key={factor.key} className="text-sm text-inkSecondary">
            {factor.label} could still favor <span className="text-ink">{factor.favoredPlayerName}</span>.
          </p>
        ))}
      </div>
    </Card>
  );
}
