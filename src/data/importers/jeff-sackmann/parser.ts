import { readFile } from "node:fs/promises";
import { parse } from "csv-parse/sync";
import type {
  SackmannMatchRow,
  SackmannPlayerRow,
  SackmannRankingRow,
} from "./types";

export async function parseSackmannCsvFile(filePath: string): Promise<SackmannMatchRow[]> {
  const fileContents = await readFile(filePath, "utf8");

  return parse(fileContents, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as SackmannMatchRow[];
}

export async function parseSackmannPlayersFile(
  filePath: string,
): Promise<SackmannPlayerRow[]> {
  const fileContents = await readFile(filePath, "utf8");

  return parse(fileContents, {
    columns: true,
    skip_empty_lines: true,
  }) as SackmannPlayerRow[];
}

export async function parseSackmannRankingsFile(
  filePath: string,
): Promise<SackmannRankingRow[]> {
  const fileContents = await readFile(filePath, "utf8");

  return parse(fileContents, {
    columns: true,
    skip_empty_lines: true,
  }) as SackmannRankingRow[];
}
