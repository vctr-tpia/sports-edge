import { FeaturePill } from "@/components/feature-pill";
import { PredictionCard } from "@/components/prediction-card";
import { SectionCard } from "@/components/section-card";
import { generatePredictionFromFeatureSnapshot } from "@/src/prediction/baseline-feature-model";
import {
  getHistoricalFeatureSnapshots,
  getLocalPlayersById,
  getLocalTournamentsById,
  getUpcomingPredictionSnapshots,
  getUpcomingPredictionSummary,
} from "@/src/lib/local-data";

function formatSyncStamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(value));
}

export default async function HomePage() {
  const [playersById, tournamentsById, snapshots, upcomingRows, upcomingSummary] = await Promise.all([
    getLocalPlayersById(),
    getLocalTournamentsById(),
    getHistoricalFeatureSnapshots(8),
    getUpcomingPredictionSnapshots(16),
    getUpcomingPredictionSummary(),
  ]);

  const scoredSnapshots = snapshots.map((snapshot) => {
    const playerA = playersById.get(snapshot.playerAId);
    const playerB = playersById.get(snapshot.playerBId);
    const actualWinner = playersById.get(snapshot.actualWinnerId);
    const tournament = tournamentsById.get(snapshot.tournamentId);

    return {
      snapshot,
      prediction: generatePredictionFromFeatureSnapshot(snapshot),
      playerAName: playerA?.full_name ?? snapshot.playerAId,
      playerBName: playerB?.full_name ?? snapshot.playerBId,
      actualWinnerName: actualWinner?.full_name ?? snapshot.actualWinnerId,
      tournamentName: tournament?.name ?? snapshot.tournamentId,
    };
  });

  const upcomingPredictions = upcomingRows.map(({ match, snapshot, prediction }) => {
    const playerA = playersById.get(snapshot.playerAId);
    const playerB = playersById.get(snapshot.playerBId);

    return {
      snapshot,
      prediction,
      match,
      tournamentName: match.tournament_name,
      playerAName: playerA?.full_name ?? snapshot.playerAId,
      playerBName: playerB?.full_name ?? snapshot.playerBId,
    };
  });
  const featuredUpcomingPredictions = [...upcomingPredictions]
    .sort((left, right) => right.prediction.confidence - left.prediction.confidence)
    .slice(0, 8);

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 sm:px-10 lg:px-12">
      <div className="bg-grid bg-[size:28px_28px]">
        <section className="grid gap-8 py-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-ink/10 bg-white/92 p-8 shadow-card lg:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-ink/45">
              Sports Edge
            </p>
            <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight text-ink">
              ATP match predictions you can actually read.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/72">
              This screen answers one question: who is favored, by how much, and why. We only
              show live ATP matches we can map safely into our own ratings and match history.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <FeaturePill label="Live ATP feed" value="RapidAPI" tone="positive" />
                <FeaturePill label="Upcoming matches" value={String(upcomingSummary.upcomingMatchCount)} />
                <FeaturePill label="Backtested examples" value={String(scoredSnapshots.length)} />
            </div>
          </div>

          <SectionCard eyebrow="How To Read This" title="What the numbers mean">
            <div className="space-y-3">
              <p>
                The percentage is the model’s win probability for each player before the match starts.
              </p>
              <p>
                Confidence shows how strong the gap is between the two players, not whether the pick is guaranteed.
              </p>
              <p>
                The reason cards show the biggest factors behind the lean, using the actual players’ numbers.
              </p>
            </div>
          </SectionCard>
        </section>

        <div className="pb-14">
          <div className="mb-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[2rem] border border-ink/10 bg-white/90 p-8 shadow-card">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink/45">
                  Live Feed
                </p>
                <span className="rounded-full bg-clay/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-clay">
                  RapidAPI ATP Sync
                </span>
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
                Upcoming ATP predictions from the live schedule pipeline
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-ink/70">
                These matches come from the live RapidAPI ATP feed, then run through our own
                identity mapping, ATP-only scope rules, and the same explainable baseline model
                we use for backtests, including surface Elo, form, and recent serve/return strength.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <FeaturePill label="Source" value="matchstat-rapidapi" tone="positive" />
                <FeaturePill
                  label="Matches in feed"
                  value={String(upcomingSummary.upcomingMatchCount)}
                />
                <FeaturePill
                  label="Tournaments"
                  value={String(upcomingSummary.tournamentCount)}
                />
              </div>
            </section>

            <SectionCard eyebrow="Sync Status" title="Live ATP guardrails">
              <div className="space-y-3">
                <p>
                  Last sync: <strong className="text-ink">{formatSyncStamp(upcomingSummary.generatedAt)}</strong>
                </p>
                <p>
                  Coverage window: <strong className="text-ink">{upcomingSummary.dateRange.from}</strong> to{" "}
                  <strong className="text-ink">{upcomingSummary.dateRange.to}</strong>
                </p>
                <p>
                  Only ATP singles matches are included. Live players are resolved through our
                  ATP identity map, and unknown names stay excluded rather than being guessed into
                  the model.
                </p>
              </div>
            </SectionCard>
          </div>

          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink/45">
                Upcoming ATP
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
                Live scheduled matches with explainable win probabilities
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-ink/70">
                Start here. These are the strongest live ATP leans the model can score right now.
              </p>
            </div>
            <div className="rounded-3xl border border-ink/10 bg-white/85 px-4 py-3 text-sm text-ink/70">
              <strong className="text-ink">{featuredUpcomingPredictions.length}</strong> featured live matches
            </div>
          </div>

          <div className="grid gap-6 pb-12">
            {featuredUpcomingPredictions.map(({ match, snapshot, prediction, tournamentName, playerAName, playerBName }) => (
              <PredictionCard
                key={snapshot.matchId}
                matchId={snapshot.matchId}
                matchDate={snapshot.matchDate}
                tournamentName={tournamentName}
                scheduledAt={match.scheduled_at}
                providerTimeLabel={match.provider_time_label}
                city={match.city}
                countryCode={match.country_code}
                tournamentStartDate={match.tournament_start_date}
                tournamentEndDate={match.tournament_end_date}
                bestOf={match.best_of}
                surface={snapshot.surface}
                round={snapshot.round}
                playerAName={playerAName}
                playerBName={playerBName}
                prediction={prediction}
              />
            ))}
          </div>

          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink/45">
                Prediction MVP
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
                Recent backtested examples
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-ink/70">
                These completed matches show how the same model looked before real ATP matches were played.
              </p>
            </div>
            <div className="rounded-3xl border border-ink/10 bg-white/85 px-4 py-3 text-sm text-ink/70">
              <strong className="text-ink">{scoredSnapshots.length}</strong> recent snapshots shown
            </div>
          </div>

          <div className="grid gap-6">
            {scoredSnapshots.map(({ snapshot, prediction, playerAName, playerBName, actualWinnerName, tournamentName }) => (
              <PredictionCard
                key={snapshot.matchId}
                matchId={snapshot.matchId}
                matchDate={snapshot.matchDate}
                tournamentName={tournamentName}
                surface={snapshot.surface}
                round={snapshot.round}
                playerAName={playerAName}
                playerBName={playerBName}
                actualWinnerName={actualWinnerName}
                prediction={prediction}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
