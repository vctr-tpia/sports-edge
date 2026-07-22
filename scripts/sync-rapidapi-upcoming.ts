import { computeUpcomingMatchPredictions } from "../src/prediction/upcoming-pipeline";
import { MatchstatRapidApiProvider } from "../src/data/providers/matchstat-rapidapi";
import { syncLiveUpcomingFeed } from "../src/upcoming/live-sync";

function addDays(baseDate: Date, days: number) {
  const next = new Date(baseDate);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function main() {
  const today = new Date();
  const dateFrom = process.argv[2] ?? formatDate(today);
  const dateTo =
    process.argv[3] ??
    formatDate(addDays(new Date(`${dateFrom}T00:00:00.000Z`), 7));

  const provider = new MatchstatRapidApiProvider();
  const syncSummary = await syncLiveUpcomingFeed(provider, dateFrom, dateTo);
  const predictionSummary = await computeUpcomingMatchPredictions(
    `${process.cwd()}/data/upcoming-matches/atp-upcoming.generated.json`,
  );

  console.log(
    JSON.stringify(
      {
        syncSummary,
        predictionSummary,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
