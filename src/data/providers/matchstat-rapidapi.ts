import type { MatchRound, Surface, TournamentLevel } from "@/src/domain/shared";
import { env } from "@/src/lib/env";
import type {
  ProviderMatchResult,
  ProviderMatchStatus,
  ProviderScheduledMatch,
  TennisScheduleProvider,
} from "./tennis-provider";

type RapidApiFixtureResponse = {
  data?: RapidApiFixture[];
  hasNextPage?: boolean;
};

type RapidApiFixture = {
  id?: number;
  date?: string | null;
  roundId?: number | null;
  round?: {
    id?: number | null;
    name?: string | null;
    round?: string | null;
  } | null;
  player1Id?: number;
  player2Id?: number;
  tournamentId?: number;
  timeGame?: string | null;
  player1?: {
    id?: number;
    name?: string | null;
    countryAcr?: string | null;
  } | null;
  player2?: {
    id?: number;
    name?: string | null;
    countryAcr?: string | null;
  } | null;
  tournament?: {
    id?: number;
    name?: string | null;
    date?: string | null;
    city?: string | null;
    country?: {
      acronym?: string | null;
      countryAcr?: string | null;
      name?: string | null;
    } | null;
    court?: {
      name?: string | null;
    } | null;
    rank?: {
      id?: number | null;
      name?: string | null;
      rank?: string | null;
    } | null;
    rankId?: number | null;
  } | null;
};

type RapidApiEventDetailResponse = {
  success?: boolean;
  message?: string | null;
  result?: {
    status?: string | null;
    id?: string | number | null;
    startTimestamp?: number | null;
    name?: string | null;
    participant1?: string | null;
    participant2?: string | null;
    league?: string | null;
    score?: string | null;
    indicator?: string | null;
    points?: string | null;
    matchId?: string | null;
  } | null;
};

function normalizeSurface(surface: string | null | undefined): Surface {
  const value = surface?.trim().toLowerCase();
  if (value === "clay") {
    return "clay";
  }
  if (value === "grass") {
    return "grass";
  }
  return "hard";
}

function normalizeRound(roundName: string | null | undefined, roundId: number | null | undefined): MatchRound {
  const normalized = roundName?.trim().toLowerCase() ?? "";
  if (normalized.includes("quarter")) {
    return "QF";
  }
  if (normalized.includes("semi")) {
    return "SF";
  }
  if (normalized === "final") {
    return "F";
  }
  if (normalized.includes("round robin")) {
    return "RR";
  }
  if (normalized.includes("bronze")) {
    return "BR";
  }
  if (normalized.includes("128")) {
    return "R128";
  }
  if (normalized.includes("64")) {
    return "R64";
  }
  if (normalized.includes("32")) {
    return "R32";
  }
  if (normalized.includes("16")) {
    return "R16";
  }

  switch (roundId) {
    case 12:
      return "F";
    case 10:
      return "SF";
    case 9:
      return "QF";
    case 7:
      return "R16";
    case 6:
      return "R32";
    case 5:
      return "R64";
    case 4:
      return "R128";
    default:
      return "R32";
  }
}

function normalizeLevel(rankLabel: string | null | undefined, rankId: number | null | undefined): TournamentLevel {
  const label = rankLabel?.trim().toLowerCase() ?? "";
  if (label.includes("grand slam")) {
    return "grand_slam";
  }
  if (label.includes("masters")) {
    return "masters";
  }
  if (label.includes("finals")) {
    return "finals";
  }
  if (label.includes("olympic")) {
    return "olympics";
  }
  if (label.includes("challenger")) {
    return "challenger";
  }
  if (label.includes("250")) {
    return "atp_250";
  }
  if (label.includes("500")) {
    return "atp_500";
  }
  if (label.includes("cup")) {
    return "team_event";
  }

  switch (rankId) {
    case 1:
      return "grand_slam";
    case 2:
      return "atp_250";
    case 3:
      return "masters";
    case 4:
      return "atp_500";
    case 5:
      return "challenger";
    default:
      return "tour";
  }
}

function toIsoDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function toIsoDateTime(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function inferBestOf(level: TournamentLevel) {
  return level === "grand_slam" ? 5 : 3;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeProviderMatchStatus(status: string | null | undefined): ProviderMatchStatus {
  const normalized = status?.trim().toLowerCase() ?? "";
  if (
    normalized === "ended" ||
    normalized === "finished" ||
    normalized === "final"
  ) {
    return "completed";
  }
  if (
    normalized === "cancelled" ||
    normalized === "postponed" ||
    normalized === "abandoned" ||
    normalized === "walkover"
  ) {
    return "cancelled";
  }
  if (
    normalized === "inplay" ||
    normalized === "live" ||
    normalized === "interrupted"
  ) {
    return "in_progress";
  }

  return "scheduled";
}

function parseWinnerSide(score: string | null | undefined): 1 | 2 | null {
  if (!score) {
    return null;
  }

  const segments = score
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
  let participant1Sets = 0;
  let participant2Sets = 0;

  for (const segment of segments) {
    const match = segment.match(/(\d+)\s*-\s*(\d+)/);
    if (!match) {
      continue;
    }

    const participant1Games = Number.parseInt(match[1], 10);
    const participant2Games = Number.parseInt(match[2], 10);

    if (participant1Games > participant2Games) {
      participant1Sets += 1;
    } else if (participant2Games > participant1Games) {
      participant2Sets += 1;
    }
  }

  if (participant1Sets === participant2Sets) {
    return null;
  }

  return participant1Sets > participant2Sets ? 1 : 2;
}

export class MatchstatRapidApiProvider implements TennisScheduleProvider {
  private readonly apiKey: string;
  private readonly host: string;
  private readonly baseUrl: string;

  constructor() {
    if (!env.RAPIDAPI_TENNIS_KEY) {
      throw new Error("Missing RAPIDAPI_TENNIS_KEY in .env.local");
    }

    this.apiKey = env.RAPIDAPI_TENNIS_KEY;
    this.host = env.RAPIDAPI_TENNIS_HOST ?? "tennis-api-atp-wta-itf.p.rapidapi.com";
    this.baseUrl = `https://${this.host}`;
  }

  private async fetchWithRetry(url: URL | string) {
    const maxAttempts = 4;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const response = await fetch(url, {
        headers: {
          "X-RapidAPI-Key": this.apiKey,
          "X-RapidAPI-Host": this.host,
        },
      });

      if (response.status !== 429) {
        return response;
      }

      if (attempt === maxAttempts) {
        return response;
      }

      await sleep(1500 * attempt);
    }

    throw new Error("Unreachable retry state");
  }

  async fetchScheduledMatches(dateFrom: string, dateTo: string): Promise<ProviderScheduledMatch[]> {
    const matches: ProviderScheduledMatch[] = [];
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const url = new URL(`${this.baseUrl}/tennis/v2/atp/fixtures/${dateFrom}/${dateTo}`);
      url.searchParams.set(
        "include",
        "round,tournament,tournament.court,tournament.rank,tournament.country",
      );
      url.searchParams.set("filter", "PlayerGroup:singles");
      url.searchParams.set("pageSize", "100");
      url.searchParams.set("pageNo", String(page));

      const response = await this.fetchWithRetry(url);

      if (!response.ok) {
        throw new Error(`RapidAPI tennis fixtures request failed with ${response.status}`);
      }

      const payload = (await response.json()) as RapidApiFixtureResponse;
      const data = payload.data ?? [];

      for (const fixture of data) {
        const playerAName = fixture.player1?.name?.trim();
        const playerBName = fixture.player2?.name?.trim();
        const playerAId = fixture.player1Id ?? fixture.player1?.id;
        const playerBId = fixture.player2Id ?? fixture.player2?.id;
        const tournamentId = fixture.tournamentId ?? fixture.tournament?.id;
        const matchId = fixture.id;

        if (!playerAName || !playerBName || !playerAId || !playerBId || !tournamentId || !matchId) {
          continue;
        }

        const surface = normalizeSurface(fixture.tournament?.court?.name);
        const level = normalizeLevel(
          fixture.tournament?.rank?.name ?? fixture.tournament?.rank?.rank,
          fixture.tournament?.rank?.id ?? fixture.tournament?.rankId,
        );
        const round = normalizeRound(
          fixture.round?.name ?? fixture.round?.round,
          fixture.round?.id ?? fixture.roundId,
        );
        const matchDate = toIsoDate(fixture.date) ?? dateFrom;
        const tournamentStartDate = toIsoDate(fixture.tournament?.date) ?? matchDate;
        const season = Number.parseInt(matchDate.slice(0, 4), 10);

        matches.push({
          provider: "matchstat-rapidapi",
          providerMatchId: String(matchId),
          providerTournamentId: String(tournamentId),
          providerPlayerAId: String(playerAId),
          providerPlayerBId: String(playerBId),
          playerAName,
          playerBName,
          playerACountryCode: fixture.player1?.countryAcr ?? null,
          playerBCountryCode: fixture.player2?.countryAcr ?? null,
          tournamentName: fixture.tournament?.name?.trim() ?? `Tournament ${tournamentId}`,
          season,
          tournamentCountryCode:
            fixture.tournament?.country?.acronym ?? fixture.tournament?.country?.countryAcr ?? null,
          city: fixture.tournament?.city?.trim() ?? null,
          surface,
          level,
          round,
          matchDate,
          scheduledAt: toIsoDateTime(fixture.date),
          providerTimeLabel: fixture.timeGame?.trim() ?? null,
          startDate: tournamentStartDate,
          endDate: dateTo,
          bestOf: inferBestOf(level),
        });
      }

      hasNextPage = payload.hasNextPage === true;
      page += 1;
    }

    return matches;
  }

  async fetchMatchResult(
    playerAName: string,
    playerBName: string,
    matchDate: string,
  ): Promise<ProviderMatchResult | null> {
    const candidates = [
      [playerAName, playerBName],
      [playerBName, playerAName],
    ] as const;

    for (const [participant1, participant2] of candidates) {
      const url =
        `${this.baseUrl}/tennis/v2/extend/api/event/get/` +
        `${encodeURIComponent(participant1)}/` +
        `${encodeURIComponent(participant2)}/` +
        `${matchDate}`;

      const response = await this.fetchWithRetry(url);

      if (response.status === 404) {
        continue;
      }

      if (!response.ok) {
        throw new Error(`RapidAPI tennis event detail request failed with ${response.status}`);
      }

      const payload = (await response.json()) as RapidApiEventDetailResponse;
      if (!payload.success || !payload.result?.participant1 || !payload.result?.participant2) {
        continue;
      }

      return {
        provider: "matchstat-rapidapi",
        providerEventId:
          payload.result.id === null || payload.result.id === undefined
            ? null
            : String(payload.result.id),
        providerMatchKey: payload.result.matchId ?? null,
        participant1Name: payload.result.participant1,
        participant2Name: payload.result.participant2,
        status: normalizeProviderMatchStatus(payload.result.status),
        providerStatus: payload.result.status ?? null,
        startTimestamp: payload.result.startTimestamp ?? null,
        score: payload.result.score ?? null,
        winnerSide: parseWinnerSide(payload.result.score),
      };
    }

    return null;
  }
}
