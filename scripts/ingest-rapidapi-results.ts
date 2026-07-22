import { MatchstatRapidApiProvider } from "../src/data/providers/matchstat-rapidapi";
import { ingestRecentMatchResults } from "../src/upcoming/results-ingester";

function parseFlag(name: string) {
  return process.argv.includes(name);
}

function parseOption(name: string, fallback: string) {
  const argument = process.argv.find((value) => value.startsWith(`${name}=`));
  return argument ? argument.slice(name.length + 1) : fallback;
}

async function main() {
  const referenceDate = parseOption("--date", "2026-07-21");
  const lookbackDays = Number.parseInt(parseOption("--lookback-days", "2"), 10);
  const dryRun = parseFlag("--dry-run");

  const provider = new MatchstatRapidApiProvider();
  const summary = await ingestRecentMatchResults({
    provider,
    referenceDate,
    lookbackDays: Number.isNaN(lookbackDays) ? 2 : lookbackDays,
    dryRun,
  });

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
