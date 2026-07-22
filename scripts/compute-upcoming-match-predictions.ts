import { computeUpcomingMatchPredictions } from "../src/prediction/upcoming-pipeline";

async function main() {
  const summary = await computeUpcomingMatchPredictions();
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
