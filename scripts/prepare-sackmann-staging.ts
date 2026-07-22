import { prepareSackmannStagingData } from "../src/data/importers/jeff-sackmann/staging";

async function main() {
  const summary = await prepareSackmannStagingData();
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
