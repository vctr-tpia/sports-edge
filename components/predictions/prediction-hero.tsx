import type { MatchDetailViewModel } from "@/src/lib/app-view-models";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfidenceBadge } from "@/components/predictions/confidence-badge";
import { ProbabilityMeter } from "@/components/predictions/probability-meter";
import { PlayerIdentity } from "@/components/matches/player-identity";

export function PredictionHero({ detail }: { detail: MatchDetailViewModel }) {
  const { match } = detail;

  return (
    <Card elevated className="rounded-hero p-6 sm:p-8">
      <div className="grid gap-6 xl:grid-cols-[1fr_1.15fr_1fr]">
        <PlayerIdentity player={match.playerA} emphasized={match.favoredPlayerId === match.playerA.id} />
        <div className="rounded-[20px] border border-borderStrong bg-black/20 p-5 text-center">
          <Badge tone="brand">Sports Edge prediction</Badge>
          <p className="numeric mt-5 text-5xl font-semibold tracking-[-0.06em] text-ink sm:text-6xl">
            {Math.round(detail.favoriteWinProbability * 100)}%
          </p>
          <p className="mt-3 text-base font-medium text-inkSecondary">
            {detail.favoredPlayerName} has the predicted advantage
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <ConfidenceBadge label={match.confidenceLabel} score={match.confidenceScore} />
            <Badge tone="neutral">Model {match.modelVersion ?? "unknown"}</Badge>
          </div>
        </div>
        <PlayerIdentity player={match.playerB} emphasized={match.favoredPlayerId === match.playerB.id} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <ProbabilityMeter
          playerAName={match.playerA.name}
          playerBName={match.playerB.name}
          playerAProbability={match.playerAProbability ?? 0.5}
          playerBProbability={match.playerBProbability ?? 0.5}
          favoredPlayerId={match.favoredPlayerId ?? match.playerA.id}
          playerAId={match.playerA.id}
          playerBId={match.playerB.id}
        />
        <div className="rounded-2xl border border-borderSubtle bg-surface2 p-4 text-sm">
          <p className="text-inkSecondary">
            Confidence and win probability are separate ideas. Probability describes the model’s
            split between players. Confidence reflects how wide that gap is, not certainty of outcome.
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.16em] text-inkMuted">
            Generated {match.generatedAt ?? "Unavailable"}
          </p>
        </div>
      </div>
    </Card>
  );
}
