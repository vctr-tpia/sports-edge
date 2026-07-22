import Link from "next/link";
import { notFound } from "next/navigation";
import { FeaturePill } from "@/components/feature-pill";
import { SectionCard } from "@/components/section-card";
import {
  getLocalPlayersById,
  getMatchDetailById,
} from "@/src/lib/local-data";
import {
  confidenceLabel,
  favoriteSummary,
  formatLocation,
  formatMatchDate,
  formatMatchDateTime,
  formatMetric,
  formatPercent,
  formatProjectionLine,
  formatProjectionMetric,
  formatRound,
  formatSurface,
} from "@/src/lib/prediction-ui";

type MatchDetailPageProps = {
  params: Promise<{
    matchId: string;
  }>;
};

export default async function MatchDetailPage({ params }: MatchDetailPageProps) {
  const { matchId } = await params;
  const [detail, playersById] = await Promise.all([
    getMatchDetailById(matchId),
    getLocalPlayersById(),
  ]);

  if (!detail) {
    notFound();
  }

  const { match, snapshot, prediction, kind, actualWinnerName } = detail;
  const playerA = playersById.get(snapshot.playerAId);
  const playerB = playersById.get(snapshot.playerBId);
  const playerAName = playerA?.full_name ?? snapshot.playerAId;
  const playerBName = playerB?.full_name ?? snapshot.playerBId;
  const {
    favoredName,
    underdogName,
    favoriteWinProbability,
    favoriteWidth,
  } = favoriteSummary(prediction, playerAName, playerBName);
  const orderedFactors = [...prediction.explanation].sort(
    (left, right) => Math.abs(right.edgeToPlayerA) - Math.abs(left.edgeToPlayerA),
  );
  const formattedScheduledAt = formatMatchDateTime(match.scheduledAt);
  const formattedMatchDate = formatMatchDate(match.matchDate);
  const location = formatLocation(match.city, match.countryCode);
  const tournamentWindow =
    match.tournamentStartDate && match.tournamentEndDate
      ? `${formatMatchDate(match.tournamentStartDate)} to ${formatMatchDate(match.tournamentEndDate)}`
      : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 sm:px-10 lg:px-12">
      <div className="bg-grid bg-[size:28px_28px]">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="text-sm font-semibold uppercase tracking-[0.18em] text-ink/45 transition hover:text-ink"
            >
              Back to predictions
            </Link>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink">
              {playerAName} vs {playerBName}
            </h1>
            <p className="mt-2 text-sm text-ink/65">
              {formattedScheduledAt ?? formattedMatchDate} • {match.tournamentName} • {formatSurface(snapshot.surface)} •{" "}
              {formatRound(snapshot.round)}
            </p>
            <p className="mt-2 text-sm text-ink/55">
              {[location, tournamentWindow, match.bestOf ? `Best of ${match.bestOf}` : null, match.providerTimeLabel]
                .filter(Boolean)
                .join(" • ")}
            </p>
          </div>
          <FeaturePill
            label={kind === "upcoming" ? "Live ATP prediction" : "Backtested example"}
            value={kind === "upcoming" ? "Live" : "History"}
            tone="positive"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[2rem] border border-ink/10 bg-white/95 p-8 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
              Match call
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
              {favoredName} is favored over {underdogName}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-ink/72">
              This is the model&apos;s pre-match read using our own Elo, surface form, recent
              results, serve and return strength, opponent quality, rest, and head-to-head signals.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-court/20 bg-court/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
                  Favorite
                </p>
                <p className="mt-2 text-xl font-semibold text-ink">{favoredName}</p>
              </div>
              <div className="rounded-3xl border border-ink/10 bg-sand/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
                  Win probability
                </p>
                <p className="mt-2 text-xl font-semibold text-ink">
                  {formatPercent(favoriteWinProbability)}
                </p>
              </div>
              <div className="rounded-3xl border border-ink/10 bg-sand/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
                  Confidence
                </p>
                <p className="mt-2 text-xl font-semibold text-ink">
                  {confidenceLabel(prediction.confidence)}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-3xl border border-ink/10 bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
                  Sets line
                </p>
                <p className="mt-2 text-xl font-semibold text-ink">
                  O/U {formatProjectionLine(prediction.projection.expectedTotalSets)}
                </p>
              </div>
              <div className="rounded-3xl border border-ink/10 bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
                  Games line
                </p>
                <p className="mt-2 text-xl font-semibold text-ink">
                  O/U {formatProjectionLine(prediction.projection.expectedTotalGames)}
                </p>
              </div>
              <div className="rounded-3xl border border-ink/10 bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
                  Straight sets
                </p>
                <p className="mt-2 text-xl font-semibold text-ink">
                  {formatPercent(prediction.projection.favoriteStraightSetsProbability)}
                </p>
              </div>
              <div className="rounded-3xl border border-ink/10 bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
                  Full distance
                </p>
                <p className="mt-2 text-xl font-semibold text-ink">
                  {formatPercent(prediction.projection.decidingSetProbability)}
                </p>
              </div>
            </div>

            <div className="mt-7 rounded-[1.5rem] border border-ink/10 bg-sand/70 p-5">
              <div className="flex items-center justify-between text-sm text-ink/75">
                <span>{favoredName}</span>
                <strong className="text-ink">{formatPercent(favoriteWinProbability)}</strong>
              </div>
              <div className="mt-3 h-4 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-court" style={{ width: favoriteWidth }} />
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-ink/65">
                <span>{playerAName}</span>
                <span>{playerBName}</span>
              </div>
            </div>
          </section>

          <SectionCard eyebrow="Status" title={kind === "upcoming" ? "Upcoming match" : "Backtest result"}>
            <div className="space-y-3">
              {kind === "upcoming" ? (
                <>
                  <p>This is a live scheduled ATP match from the synced feed.</p>
                  <p>
                    Schedule:{" "}
                    <strong className="text-ink">
                      {formattedScheduledAt ?? formattedMatchDate}
                    </strong>
                  </p>
                  <p>
                    The prediction was generated at <strong className="text-ink">{prediction.generatedAt}</strong>.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Winner: <strong className="text-ink">{actualWinnerName}</strong>
                  </p>
                  <p>This snapshot reflects only the information available before the match began.</p>
                </>
              )}
            </div>
          </SectionCard>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionCard eyebrow="Scorecard" title="Full probability split">
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span>{playerAName}</span>
                <strong className="text-ink">{formatPercent(prediction.playerAWinProbability)}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>{playerBName}</span>
                <strong className="text-ink">{formatPercent(prediction.playerBWinProbability)}</strong>
              </div>
              <div className="flex items-center justify-between border-t border-ink/10 pt-4">
                <span>Confidence</span>
                <strong className="text-ink">
                  {confidenceLabel(prediction.confidence)} ({formatPercent(prediction.confidence)})
                </strong>
              </div>
              <div className="flex items-center justify-between border-t border-ink/10 pt-4">
                <span>Expected total sets</span>
                <strong className="text-ink">
                  {formatProjectionMetric(prediction.projection.expectedTotalSets)}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Expected total games</span>
                <strong className="text-ink">
                  {formatProjectionMetric(prediction.projection.expectedTotalGames)}
                </strong>
              </div>
            </div>
          </SectionCard>

          <section className="rounded-[2rem] border border-ink/10 bg-white/95 p-8 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
              Why the model leans this way
            </p>
            <div className="mt-5 grid gap-4">
              {orderedFactors.map((factor) => (
                <div
                  key={factor.key}
                  className="grid gap-3 rounded-[1.5rem] border border-ink/10 bg-sand/70 p-5 md:grid-cols-[0.8fr_1.2fr_1.2fr_0.8fr]"
                >
                  <div>
                    <p className="font-semibold text-ink">{factor.label}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-ink/45">
                      Weight {Math.round(factor.weight * 100)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">
                      {playerAName}
                    </p>
                    <p className="mt-1 text-base font-medium text-ink">
                      {formatMetric(factor.playerAValue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">
                      {playerBName}
                    </p>
                    <p className="mt-1 text-base font-medium text-ink">
                      {formatMetric(factor.playerBValue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">
                      Edge
                    </p>
                    <p className="mt-1 text-base font-semibold text-ink">
                      {factor.edgeToPlayerA >= 0 ? playerAName : playerBName}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
