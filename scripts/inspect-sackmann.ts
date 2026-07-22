import { readdir } from "node:fs/promises";
import path from "node:path";
import { inspectSackmannFile } from "../src/data/importers/jeff-sackmann/inspect";

const DATA_DIR = path.join(process.cwd(), "data", "jeff-sackmann", "atp");

async function main() {
  const files = (await readdir(DATA_DIR))
    .filter((file) => file.endsWith(".csv"))
    .sort();

  if (files.length === 0) {
    console.error(`No CSV files found in ${DATA_DIR}`);
    console.error("Download ATP files and place them in that directory first.");
    process.exitCode = 1;
    return;
  }

  const summaries = await Promise.all(
    files.map((fileName) => inspectSackmannFile(path.join(DATA_DIR, fileName))),
  );

  for (const summary of summaries) {
    console.log(
      JSON.stringify(
        {
          fileName: summary.fileName,
          season: summary.season,
          rowCount: summary.rowCount,
          surfaces: summary.surfaces,
          tournamentLevels: summary.tournamentLevels,
        },
        null,
        2,
      ),
    );
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
