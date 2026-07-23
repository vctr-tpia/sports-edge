import { archiveSettledPredictionLedger } from "@/src/upcoming/prediction-ledger-archive";

async function main() {
  const referenceDate = process.argv[2] ?? new Date().toISOString().slice(0, 10);
  const summary = await archiveSettledPredictionLedger(referenceDate);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
