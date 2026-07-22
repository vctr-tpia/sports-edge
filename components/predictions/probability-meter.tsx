import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/src/lib/cn";

type ProbabilityMeterProps = {
  playerAName: string;
  playerBName: string;
  playerAProbability: number;
  playerBProbability: number;
  favoredPlayerId: string;
  playerAId: string;
  playerBId: string;
};

export function ProbabilityMeter({
  playerAName,
  playerBName,
  playerAProbability,
  playerBProbability,
  favoredPlayerId,
  playerAId,
  playerBId,
}: ProbabilityMeterProps) {
  return (
    <div className="rounded-2xl border border-borderSubtle bg-surface2 p-4">
      <div className="flex items-center justify-between text-sm text-inkSecondary">
        <span className={cn("font-medium", favoredPlayerId === playerAId && "text-ink")}>
          {playerAName}
        </span>
        <span className={cn("font-medium", favoredPlayerId === playerBId && "text-ink")}>
          {playerBName}
        </span>
      </div>
      <div className="mt-3 grid items-center gap-3 md:grid-cols-[auto_1fr_auto]">
        <span className="numeric text-sm font-semibold text-ink">{Math.round(playerAProbability * 100)}%</span>
        <ProgressBar value={playerAProbability} tone="brand" />
        <span className="numeric text-right text-sm font-semibold text-ink">{Math.round(playerBProbability * 100)}%</span>
      </div>
    </div>
  );
}
