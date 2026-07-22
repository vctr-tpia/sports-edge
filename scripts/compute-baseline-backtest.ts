import { computeBaselineBacktest } from "../src/evaluation/baseline-backtest";

async function main() {
  const summary = await computeBaselineBacktest();
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
