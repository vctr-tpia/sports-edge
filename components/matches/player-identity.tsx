import { cn } from "@/src/lib/cn";
import type { PlayerSummary } from "@/src/lib/app-view-models";

type PlayerIdentityProps = {
  player: PlayerSummary;
  emphasized?: boolean;
  probability?: string;
  className?: string;
};

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function PlayerIdentity({
  player,
  emphasized = false,
  probability,
  className,
}: PlayerIdentityProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-sm font-semibold",
          emphasized
            ? "border-brand/25 bg-brandSoft text-ink"
            : "border-borderSubtle bg-white/[0.03] text-inkSecondary",
        )}
      >
        {initials(player.name)}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn("truncate text-sm font-medium", emphasized ? "text-ink" : "text-inkSecondary")}>
            {player.name}
          </p>
          {player.countryCode ? (
            <span className="rounded-full border border-borderSubtle px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-inkMuted">
              {player.countryCode}
            </span>
          ) : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-inkMuted">
          <span>{player.ranking ? `Rank #${player.ranking}` : "Ranking unavailable"}</span>
          {probability ? <span className="numeric text-inkSecondary">{probability}</span> : null}
        </div>
      </div>
    </div>
  );
}
