import { appendFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { MatchstatRapidApiProvider } from "../src/data/providers/matchstat-rapidapi";
import { computeUpcomingMatchPredictions } from "../src/prediction/upcoming-pipeline";
import { syncLiveUpcomingFeed } from "../src/upcoming/live-sync";
import { loadUpcomingMatchPredictionsToSupabase } from "../src/upcoming/load-upcoming-match-predictions-to-supabase";
import { ingestRecentMatchResults } from "../src/upcoming/results-ingester";

const OUTPUT_DIR = path.join(process.cwd(), "work", "automation", "daily-refresh");
const UPCOMING_DIR = path.join(process.cwd(), "work", "upcoming", "atp");

type RateLimitedSyncSummary = {
  provider: "matchstat-rapidapi";
  dateFrom: string;
  dateTo: string;
  status: "rate_limited";
  skippedPredictionRefresh: true;
  message: string;
};

function addDays(baseDate: Date, days: number) {
  const next = new Date(baseDate);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isRapidApiRateLimitError(error: unknown) {
  return error instanceof Error && error.message.includes("429");
}

function isRateLimitedSyncSummary(
  summary: Awaited<ReturnType<typeof syncLiveUpcomingFeed>> | RateLimitedSyncSummary,
): summary is RateLimitedSyncSummary {
  return "status" in summary && summary.status === "rate_limited";
}

async function writeGitHubStepSummary(summary: {
  referenceDate: string;
  dateTo: string;
  settlementSummary: unknown;
  syncSummary:
    | Awaited<ReturnType<typeof syncLiveUpcomingFeed>>
    | RateLimitedSyncSummary;
  predictionSummary:
    | Awaited<ReturnType<typeof computeUpcomingMatchPredictions>>
    | {
        status: "skipped";
        reason: "rapidapi_rate_limited";
      };
  loadSummary:
    | Awaited<ReturnType<typeof loadUpcomingMatchPredictionsToSupabase>>
    | {
        status: "skipped";
        reason: "rapidapi_rate_limited";
      };
}) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) {
    return;
  }

  const syncOutcome = summary.syncSummary;
  let liveSyncLine: string;
  if (isRateLimitedSyncSummary(syncOutcome)) {
    liveSyncLine = syncOutcome.message;
  } else {
    liveSyncLine = `${syncOutcome.resolvedMatches}/${syncOutcome.supportedMatches} supported matches resolved`;
  }
  const lines = [
    "## ATP Daily Refresh",
    "",
    `- Health: ${isRateLimitedSyncSummary(syncOutcome) ? "Rate limited / stale data" : "Healthy"}`,
    `- Window: ${summary.referenceDate} → ${summary.dateTo}`,
    `- Live sync: ${liveSyncLine}`,
    `- Predictions: ${
      "status" in summary.predictionSummary
        ? summary.predictionSummary.status === "skipped"
          ? "Skipped because RapidAPI quota was exhausted"
          : "Completed"
        : "Completed"
    }`,
    `- Supabase load: ${
      "status" in summary.loadSummary
        ? summary.loadSummary.status === "skipped"
          ? "Skipped because RapidAPI quota was exhausted"
          : "Completed"
        : "Completed"
    }`,
    "",
  ];

  await appendFile(summaryPath, `${lines.join("\n")}\n`, "utf8");
}

async function main() {
  const today = new Date();
  const referenceDate = process.argv[2] ?? formatDate(today);
  const syncWindowDays = Number.parseInt(process.argv[3] ?? "7", 10);
  const lookbackDays = Number.parseInt(process.argv[4] ?? "2", 10);
  const dateTo = formatDate(
    addDays(new Date(`${referenceDate}T00:00:00.000Z`), Number.isNaN(syncWindowDays) ? 7 : syncWindowDays),
  );

  const provider = new MatchstatRapidApiProvider();
  const settlementSummary = await ingestRecentMatchResults({
    provider,
    referenceDate,
    lookbackDays: Number.isNaN(lookbackDays) ? 2 : lookbackDays,
  });
  let syncSummary:
    | Awaited<ReturnType<typeof syncLiveUpcomingFeed>>
    | RateLimitedSyncSummary;
  let predictionSummary:
    | Awaited<ReturnType<typeof computeUpcomingMatchPredictions>>
    | {
        status: "skipped";
        reason: "rapidapi_rate_limited";
      };
  let loadSummary:
    | Awaited<ReturnType<typeof loadUpcomingMatchPredictionsToSupabase>>
    | {
        status: "skipped";
        reason: "rapidapi_rate_limited";
      };

  try {
    syncSummary = await syncLiveUpcomingFeed(provider, referenceDate, dateTo);
    predictionSummary = await computeUpcomingMatchPredictions(
      `${process.cwd()}/data/upcoming-matches/atp-upcoming.generated.json`,
    );
    loadSummary = await loadUpcomingMatchPredictionsToSupabase();
  } catch (error) {
    if (!isRapidApiRateLimitError(error)) {
      throw error;
    }

    syncSummary = {
      provider: "matchstat-rapidapi",
      dateFrom: referenceDate,
      dateTo,
      status: "rate_limited",
      skippedPredictionRefresh: true,
      message:
        "RapidAPI fixture quota was exhausted, so live sync and prediction refresh were skipped for this run.",
    };
    predictionSummary = {
      status: "skipped",
      reason: "rapidapi_rate_limited",
    };
    loadSummary = {
      status: "skipped",
      reason: "rapidapi_rate_limited",
    };
  }

  const summary = {
    referenceDate,
    dateTo,
    settlementSummary,
    syncSummary,
    predictionSummary,
    loadSummary,
  };

  const refreshHealth = {
    generatedAt: new Date().toISOString(),
    provider: "matchstat-rapidapi",
    status:
      isRateLimitedSyncSummary(syncSummary) ? "rate_limited" : "healthy",
    message: isRateLimitedSyncSummary(syncSummary)
      ? syncSummary.message
      : "ATP live fixtures, predictions, and Supabase loads completed successfully.",
    referenceDate,
    dateTo,
    syncStatus:
      isRateLimitedSyncSummary(syncSummary) ? syncSummary.status : "success",
    predictionStatus:
      "status" in predictionSummary
        ? predictionSummary.status
        : "completed",
    loadStatus:
      "status" in loadSummary
        ? loadSummary.status
        : "completed",
  } as const;

  await mkdir(OUTPUT_DIR, { recursive: true });
  await mkdir(UPCOMING_DIR, { recursive: true });
  await writeFile(
    path.join(OUTPUT_DIR, "latest-daily-refresh-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(UPCOMING_DIR, "refresh-health.json"),
    `${JSON.stringify(refreshHealth, null, 2)}\n`,
    "utf8",
  );
  await writeGitHubStepSummary(summary);

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
