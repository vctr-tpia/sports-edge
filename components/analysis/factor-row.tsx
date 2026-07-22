import type { FactorInsightViewModel } from "@/src/lib/app-view-models";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function strengthLabel(strength: FactorInsightViewModel["strength"]) {
  switch (strength) {
    case "strong":
      return "Strong advantage";
    case "moderate":
      return "Moderate advantage";
    case "slight":
      return "Slight advantage";
    default:
      return "Neutral";
  }
}

export function FactorRow({
  factor,
  playerAName,
  playerBName,
}: {
  factor: FactorInsightViewModel;
  playerAName: string;
  playerBName: string;
}) {
  return (
    <Card className="rounded-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">{factor.label}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-inkMuted">
            {strengthLabel(factor.strength)}
          </p>
        </div>
        <Badge tone={factor.favoredPlayerId ? "brand" : "neutral"}>
          {factor.favoredPlayerName ? `${factor.favoredPlayerName} edge` : "Neutral"}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_0.8fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-inkMuted">{playerAName}</p>
          <p className="numeric mt-1 text-base font-medium text-ink">{factor.playerAValue.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-inkMuted">{playerBName}</p>
          <p className="numeric mt-1 text-base font-medium text-ink">{factor.playerBValue.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-inkMuted">Model impact</p>
          <p className="numeric mt-1 text-base font-semibold text-ink">x{factor.weight.toFixed(3)}</p>
        </div>
      </div>
    </Card>
  );
}
