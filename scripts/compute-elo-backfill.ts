import { computeEloBackfill } from "../src/prediction/elo-backfill";

async function main() {
  const summary = await computeEloBackfill();
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
