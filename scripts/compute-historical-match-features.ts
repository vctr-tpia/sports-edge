import { computeHistoricalMatchFeatures } from "../src/prediction/feature-backfill";

async function main() {
  const summary = await computeHistoricalMatchFeatures();
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
