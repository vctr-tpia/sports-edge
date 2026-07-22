import { prepareActiveHistoryNormalization } from "../src/data/importers/jeff-sackmann/normalize";

async function main() {
  const summary = await prepareActiveHistoryNormalization();
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
