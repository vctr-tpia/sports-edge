import path from "node:path";
import type { SackmannFileSummary, SackmannMatchRow } from "./types";
import { parseSackmannCsvFile } from "./parser";

function inferSeasonFromFileName(fileName: string): number | null {
  const match = fileName.match(/atp_matches_(\d{4})\.csv$/);
  if (!match) {
    return null;
  }

  return Number.parseInt(match[1], 10);
}

function inferSeasonFromRows(rows: SackmannMatchRow[]): number | null {
  const value = rows[0]?.tourney_date;
  if (!value || value.length < 4) {
    return null;
  }

  const parsed = Number.parseInt(value.slice(0, 4), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function uniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort();
}

export async function inspectSackmannFile(filePath: string): Promise<SackmannFileSummary> {
  const rows = await parseSackmannCsvFile(filePath);
  const fileName = path.basename(filePath);

  return {
    fileName,
    rowCount: rows.length,
    season: inferSeasonFromFileName(fileName) ?? inferSeasonFromRows(rows),
    surfaces: uniqueValues(rows.map((row) => row.surface)),
    tournamentLevels: uniqueValues(rows.map((row) => row.tourney_level)),
  };
}
