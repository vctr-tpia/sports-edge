import Link from "next/link";
import type { MatchPredictionViewModel } from "@/src/lib/app-view-models";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { MatchStatusBadge } from "@/components/matches/match-status-badge";
import { PlayerIdentity } from "@/components/matches/player-identity";
import { ConfidenceBadge } from "@/components/predictions/confidence-badge";
import { ProbabilityMeter } from "@/components/predictions/probability-meter";

type MatchCardProps = {
  match: MatchPredictionViewModel;
  compact?: boolean;
};

function surfaceLabel(surface?: string | null) {
  if (!surface) return "Unknown";
  return `${surface[0].toUpperCase()}${surface.slice(1)}`;
}

function formatSchedule(value?: string | null, fallbackDate?: string) {
  if (!value) {
    return fallbackDate ?? "Time unavailable";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallbackDate ?? "Time unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(parsed);
}

export function MatchCard({ match, compact = false }: MatchCardProps) {
  return (
    <Card className="rounded-hero p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <MatchStatusBadge status={match.status} />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-inkMuted">
              {match.tournamentName}
            </p>
          </div>
          <p className="mt-3 text-sm text-inkSecondary">
            {[surfaceLabel(match.surface), match.round, match.bestOf ? `Best of ${match.bestOf}` : null]
              .filter(Boolean)
              .join(" • ")}
          </p>
          <p className="mt-2 text-sm text-inkMuted">
            {formatSchedule(match.scheduledAt, match.matchDate)}
          </p>
        </div>
        <ConfidenceBadge label={match.confidenceLabel} score={match.confidenceScore} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <PlayerIdentity
          player={match.playerA}
          emphasized={match.favoredPlayerId === match.playerA.id}
          probability={
            match.playerAProbability !== undefined && match.playerAProbability !== null
              ? `${Math.round(match.playerAProbability * 100)}% model`
              : undefined
          }
        />
        <PlayerIdentity
          player={match.playerB}
          emphasized={match.favoredPlayerId === match.playerB.id}
          probability={
            match.playerBProbability !== undefined && match.playerBProbability !== null
              ? `${Math.round(match.playerBProbability * 100)}% model`
              : undefined
          }
        />
      </div>

      {match.playerAProbability !== undefined &&
      match.playerAProbability !== null &&
      match.playerBProbability !== undefined &&
      match.playerBProbability !== null &&
      match.favoredPlayerId ? (
        <div className="mt-5">
          <ProbabilityMeter
            playerAName={match.playerA.name}
            playerBName={match.playerB.name}
            playerAProbability={match.playerAProbability}
            playerBProbability={match.playerBProbability}
            favoredPlayerId={match.favoredPlayerId}
            playerAId={match.playerA.id}
            playerBId={match.playerB.id}
          />
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-inkSecondary">
          <p>
            Top factor: <span className="text-ink">{match.topFactorLabel ?? "Prediction unavailable"}</span>
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-inkMuted">
            Model {match.modelVersion ?? "unknown"} • Generated {match.generatedAt ?? "unavailable"}
          </p>
        </div>
        <ButtonLink href={`/match/${match.matchId}`} variant={compact ? "ghost" : "secondary"}>
          View analysis
        </ButtonLink>
      </div>
    </Card>
  );
}
