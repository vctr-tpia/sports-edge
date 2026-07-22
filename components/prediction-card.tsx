import Link from "next/link";
import type { MatchPrediction } from "@/src/domain/predictions/explanation";
import {
  confidenceLabel,
  favoriteSummary,
  formatLocation,
  formatMatchDate,
  formatMatchDateTime,
  formatPercent,
  formatProjectionLine,
  formatProjectionMetric,
  formatRound,
  formatSurface,
} from "@/src/lib/prediction-ui";

type PredictionCardProps = {
  matchId: string;
  matchDate: string;
  tournamentName: string;
  scheduledAt?: string | null;
  providerTimeLabel?: string | null;
  city?: string | null;
  countryCode?: string | null;
  tournamentStartDate?: string | null;
  tournamentEndDate?: string | null;
  bestOf?: number | null;
  surface: string;
  round: string;
  playerAName: string;
  playerBName: string;
  actualWinnerName?: string | null;
  prediction: MatchPrediction;
};

export function PredictionCard({
  matchId,
  matchDate,
  tournamentName,
  scheduledAt,
  providerTimeLabel,
  city,
  countryCode,
  tournamentStartDate,
  tournamentEndDate,
  bestOf,
  surface,
  round,
  playerAName,
  playerBName,
  actualWinnerName,
  prediction,
}: PredictionCardProps) {
  const topFactors = [...prediction.explanation]
    .sort((left, right) => Math.abs(right.edgeToPlayerA) - Math.abs(left.edgeToPlayerA))
    .slice(0, 3);

  const { favoredName, underdogName, favoriteWinProbability, favoriteWidth } = favoriteSummary(
    prediction,
    playerAName,
    playerBName,
  );
  const location = formatLocation(city, countryCode);
  const formattedScheduledAt = formatMatchDateTime(scheduledAt);
  const formattedMatchDate = formatMatchDate(matchDate);
  const tournamentWindow =
    tournamentStartDate && tournamentEndDate
      ? `${formatMatchDate(tournamentStartDate)} to ${formatMatchDate(tournamentEndDate)}`
      : null;

  return (
    <article className="rounded-[2rem] border border-ink/10 bg-white/95 p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink/45">
            {formattedScheduledAt ?? formattedMatchDate} • {tournamentName}
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
            {playerAName} vs {playerBName}
          </h3>
          <p className="mt-2 text-sm text-ink/60">
            {formatSurface(surface)} • {formatRound(round)}
          </p>
          <p className="mt-1 text-sm text-ink/50">
            {[location, tournamentWindow, bestOf ? `Best of ${bestOf}` : null, providerTimeLabel]
              .filter(Boolean)
              .join(" • ")}
          </p>
        </div>
        <div className="min-w-[220px] rounded-3xl border border-court/20 bg-court/10 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
            Model Pick
          </p>
          <p className="mt-1 text-lg font-semibold text-ink">{favoredName}</p>
          <p className="text-sm text-ink/70">{formatPercent(favoriteWinProbability)} win probability</p>
        </div>
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-ink/10 bg-sand/70 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">What the model is saying</p>
        <p className="mt-2 text-base font-medium text-ink">
          {favoredName} is favored over {underdogName}.
        </p>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between text-sm text-ink/75">
            <span>{favoredName}</span>
            <strong className="text-ink">{formatPercent(favoriteWinProbability)}</strong>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-court" style={{ width: favoriteWidth }} />
          </div>
          <div className="flex items-center justify-between text-sm text-ink/65">
            <span>{playerAName}</span>
            <span>{playerBName}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-ink/10 bg-white/70 px-5 py-4">
        <div className="flex flex-wrap gap-4 text-sm text-ink/75">
          <div>
            <span className="text-ink/45">Confidence</span>
            <p className="font-semibold text-ink">
              {confidenceLabel(prediction.confidence)} ({formatPercent(prediction.confidence)})
            </p>
          </div>
          <div>
            <span className="text-ink/45">{playerAName}</span>
            <p className="font-semibold text-ink">{formatPercent(prediction.playerAWinProbability)}</p>
          </div>
          <div>
            <span className="text-ink/45">{playerBName}</span>
            <p className="font-semibold text-ink">{formatPercent(prediction.playerBWinProbability)}</p>
          </div>
          <div>
            <span className="text-ink/45">Sets line</span>
            <p className="font-semibold text-ink">
              O/U {formatProjectionLine(prediction.projection.expectedTotalSets)}
            </p>
          </div>
          <div>
            <span className="text-ink/45">Games line</span>
            <p className="font-semibold text-ink">
              O/U {formatProjectionLine(prediction.projection.expectedTotalGames)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {topFactors.map((factor) => (
            <div
              key={factor.key}
              className="rounded-full border border-ink/10 bg-sand px-3 py-2 text-xs font-semibold text-ink/75"
            >
              {factor.label}: {factor.edgeToPlayerA >= 0 ? playerAName : playerBName}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <p className="text-sm text-ink/60">
          {actualWinnerName
            ? `Backtest result: ${actualWinnerName} won`
            : "Upcoming live match from the ATP feed"}
        </p>
        <Link
          href={`/match/${matchId}`}
          className="rounded-full border border-ink/10 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-court/40 hover:bg-court/10"
        >
          Full breakdown
        </Link>
      </div>
    </article>
  );
}
