import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdminClient } from "@/src/lib/supabase-admin";
import { loadActivePlayers, type ActivePlayer } from "@/src/lib/active-history";
import {
  initialsMatch,
  normalizePersonName,
  normalizedNameTokens,
} from "@/src/lib/name-normalization";
import type { UpcomingFeed, UpcomingTournamentInput } from "@/src/domain/upcoming";
import type { TournamentLevel } from "@/src/domain/shared";
import type { ProviderScheduledMatch, TennisScheduleProvider } from "@/src/data/providers/tennis-provider";
const OVERRIDES_PATH = path.join(
  process.cwd(),
  "data",
  "config",
  "upcoming-player-overrides.json",
);
const GENERATED_FEED_PATH = path.join(
  process.cwd(),
  "data",
  "upcoming-matches",
  "atp-upcoming.generated.json",
);
const OUTPUT_DIR = path.join(process.cwd(), "work", "upcoming", "atp");

type PlayerExternalIdRow = {
  provider: string;
  external_player_id: string;
  player_id: string;
  provider_player_name: string | null;
  provider_country_code: string | null;
};

type UnresolvedPlayer = {
  provider: string;
  externalPlayerId: string;
  providerName: string;
  providerCountryCode: string | null;
  reason: string;
};

type OverrideConfig = {
  aliases: {
    provider: string;
    providerName: string;
    providerCountryCode: string | null;
    externalAtpId: string;
    notes?: string;
  }[];
  ignore: {
    provider: string;
    providerName: string;
    providerCountryCode: string | null;
    reason: string;
  }[];
};

type LiveSyncSummary = {
  provider: string;
  dateFrom: string;
  dateTo: string;
  fetchedMatches: number;
  supportedMatches: number;
  resolvedMatches: number;
  unresolvedPlayers: number;
  autoMappedPlayers: number;
  generatedFeedPath: string;
};

async function readJsonLines<T>(filePath: string): Promise<T[]> {
  const content = await readFile(filePath, "utf8");
  return content
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

type ResolvedScheduledMatch = ProviderScheduledMatch & {
  playerAExternalAtpId: string;
  playerBExternalAtpId: string;
};

function groupMatchesIntoFeed(matches: ResolvedScheduledMatch[]): UpcomingFeed {
  const tournamentMap = new Map<string, UpcomingTournamentInput>();

  for (const match of matches) {
    const key = `${match.providerTournamentId}:${match.matchDate}`;
    const tournament =
      tournamentMap.get(key) ??
      {
        externalTournamentId: match.providerTournamentId,
        name: match.tournamentName,
        season: match.season,
        countryCode: match.tournamentCountryCode,
        city: match.city,
        surface: match.surface,
        level: match.level,
        startDate: match.startDate,
        endDate: match.endDate,
        matches: [],
      };

    tournament.matches.push({
      externalMatchId: match.providerMatchId,
      matchDate: match.matchDate,
      scheduledAt: match.scheduledAt,
      providerTimeLabel: match.providerTimeLabel,
      round: match.round,
      bestOf: match.bestOf,
      playerAExternalAtpId: match.playerAExternalAtpId,
      playerBExternalAtpId: match.playerBExternalAtpId,
    });

    tournamentMap.set(key, tournament);
  }

  return {
    generatedAt: new Date().toISOString(),
    source: "matchstat-rapidapi",
    tournaments: [...tournamentMap.values()],
  };
}

function overrideKey(provider: string, providerName: string, providerCountryCode: string | null) {
  return `${provider}::${normalizePersonName(providerName)}::${providerCountryCode ?? ""}`;
}

function choosePlayerMatch(
  candidates: ActivePlayer[],
  providerName: string,
  providerCountryCode: string | null,
): ActivePlayer | null {
  const normalizedName = normalizePersonName(providerName);
  const providerTokens = normalizedNameTokens(providerName);
  const exactNameMatches = candidates.filter(
    (candidate) => normalizePersonName(candidate.full_name) === normalizedName,
  );

  const countryFiltered = providerCountryCode
    ? exactNameMatches.filter((candidate) => candidate.country_code === providerCountryCode)
    : exactNameMatches;

  if (countryFiltered.length === 1) {
    return countryFiltered[0];
  }

  if (!providerCountryCode && exactNameMatches.length === 1) {
    return exactNameMatches[0];
  }

  const subsetMatches = candidates.filter((candidate) => {
    const candidateTokens = normalizedNameTokens(candidate.full_name);
    return (
      candidateTokens.length >= 2 &&
      candidateTokens.every((token) => providerTokens.includes(token))
    );
  });
  const subsetCountryFiltered = providerCountryCode
    ? subsetMatches.filter((candidate) => candidate.country_code === providerCountryCode)
    : subsetMatches;

  if (subsetCountryFiltered.length === 1) {
    return subsetCountryFiltered[0];
  }

  const initialAndSurnameMatches = candidates.filter((candidate) => {
    const candidateTokens = normalizedNameTokens(candidate.full_name);
    if (candidateTokens.length === 0 || providerTokens.length === 0) {
      return false;
    }

    const sameSurname =
      candidateTokens[candidateTokens.length - 1] === providerTokens[providerTokens.length - 1];
    const sameInitial = initialsMatch(candidateTokens[0], providerTokens[0]);

    return sameSurname && sameInitial;
  });
  const initialCountryFiltered = providerCountryCode
    ? initialAndSurnameMatches.filter((candidate) => candidate.country_code === providerCountryCode)
    : initialAndSurnameMatches;

  if (initialCountryFiltered.length === 1) {
    return initialCountryFiltered[0];
  }

  return null;
}

function isSupportedAtpLevel(level: TournamentLevel) {
  return (
    level === "grand_slam" ||
    level === "masters" ||
    level === "atp_500" ||
    level === "atp_250" ||
    level === "finals" ||
    level === "team_event" ||
    level === "olympics"
  );
}

function isSinglesMatch(match: ProviderScheduledMatch) {
  return !match.playerAName.includes("/") && !match.playerBName.includes("/");
}

export async function syncLiveUpcomingFeed(
  provider: TennisScheduleProvider,
  dateFrom: string,
  dateTo: string,
) {
  await mkdir(path.dirname(GENERATED_FEED_PATH), { recursive: true });
  await mkdir(OUTPUT_DIR, { recursive: true });

  const [localPlayers, providerMatches, overrideConfig] = await Promise.all([
    loadActivePlayers(),
    provider.fetchScheduledMatches(dateFrom, dateTo),
    readFile(OVERRIDES_PATH, "utf8").then((content) => JSON.parse(content) as OverrideConfig),
  ]);
  const supportedProviderMatches = providerMatches.filter(
    (match) => isSupportedAtpLevel(match.level) && isSinglesMatch(match),
  );
  const localPlayerById = new Map(localPlayers.map((player) => [player.id, player]));
  const localPlayerByExternalAtpId = new Map(
    localPlayers.map((player) => [player.external_atp_id, player]),
  );
  const aliasByKey = new Map(
    overrideConfig.aliases.map((alias) => [
      overrideKey(alias.provider, alias.providerName, alias.providerCountryCode),
      alias,
    ]),
  );
  const ignoredByKey = new Map(
    overrideConfig.ignore.map((entry) => [
      overrideKey(entry.provider, entry.providerName, entry.providerCountryCode),
      entry,
    ]),
  );

  const playerNameCandidates = new Map<string, ActivePlayer[]>();
  for (const player of localPlayers) {
    const key = normalizePersonName(player.full_name);
    playerNameCandidates.set(key, [...(playerNameCandidates.get(key) ?? []), player]);
  }

  const client = getSupabaseAdminClient();
  const { data: existingMappings, error: mappingsError } = await client
    .from("player_external_ids")
    .select("provider, external_player_id, player_id, provider_player_name, provider_country_code")
    .eq("provider", "matchstat-rapidapi");

  if (mappingsError) {
    throw new Error(`Failed to load player_external_ids: ${mappingsError.message}`);
  }

  const mappingByExternalId = new Map(
    (existingMappings ?? []).map((row) => [row.external_player_id, row as PlayerExternalIdRow]),
  );

  const unresolvedPlayers: UnresolvedPlayer[] = [];
  const autoCreatedMappings: PlayerExternalIdRow[] = [];
  const resolvedMatches: ResolvedScheduledMatch[] = [];

  function resolveProviderPlayer(externalPlayerId: string, name: string, countryCode: string | null) {
    const ignoredOverride = ignoredByKey.get(overrideKey("matchstat-rapidapi", name, countryCode));
    if (ignoredOverride) {
      unresolvedPlayers.push({
        provider: "matchstat-rapidapi",
        externalPlayerId,
        providerName: name,
        providerCountryCode: countryCode,
        reason: ignoredOverride.reason,
      });
      return null;
    }

    const existing = mappingByExternalId.get(externalPlayerId);
    if (existing) {
      return existing.player_id;
    }

    const aliasOverride = aliasByKey.get(overrideKey("matchstat-rapidapi", name, countryCode));
    if (aliasOverride) {
      const aliasedPlayer = localPlayerByExternalAtpId.get(aliasOverride.externalAtpId);
      if (!aliasedPlayer) {
        throw new Error(
          `Override for ${name} points to missing local external ATP ID ${aliasOverride.externalAtpId}.`,
        );
      }

      const mapping: PlayerExternalIdRow = {
        provider: "matchstat-rapidapi",
        external_player_id: externalPlayerId,
        player_id: aliasedPlayer.id,
        provider_player_name: name,
        provider_country_code: countryCode,
      };

      mappingByExternalId.set(externalPlayerId, mapping);
      autoCreatedMappings.push(mapping);
      return aliasedPlayer.id;
    }

    const candidates = playerNameCandidates.get(normalizePersonName(name)) ?? [];
    const chosen = choosePlayerMatch(candidates, name, countryCode);
    if (!chosen) {
      unresolvedPlayers.push({
        provider: "matchstat-rapidapi",
        externalPlayerId,
        providerName: name,
        providerCountryCode: countryCode,
        reason: candidates.length === 0 ? "no_name_match" : "ambiguous_name_match",
      });
      return null;
    }

    const mapping: PlayerExternalIdRow = {
      provider: "matchstat-rapidapi",
      external_player_id: externalPlayerId,
      player_id: chosen.id,
      provider_player_name: name,
      provider_country_code: countryCode,
    };

    mappingByExternalId.set(externalPlayerId, mapping);
    autoCreatedMappings.push(mapping);
    return chosen.id;
  }

  for (const match of supportedProviderMatches) {
    const resolvedPlayerAId = resolveProviderPlayer(
      match.providerPlayerAId,
      match.playerAName,
      match.playerACountryCode,
    );
    const resolvedPlayerBId = resolveProviderPlayer(
      match.providerPlayerBId,
      match.playerBName,
      match.playerBCountryCode,
    );

    if (!resolvedPlayerAId || !resolvedPlayerBId) {
      continue;
    }

    const playerA = localPlayerById.get(resolvedPlayerAId);
    const playerB = localPlayerById.get(resolvedPlayerBId);

    if (!playerA?.external_atp_id || !playerB?.external_atp_id) {
      unresolvedPlayers.push({
        provider: "matchstat-rapidapi",
        externalPlayerId: `${match.providerPlayerAId}:${match.providerPlayerBId}`,
        providerName: `${match.playerAName} vs ${match.playerBName}`,
        providerCountryCode: null,
        reason: "resolved_player_missing_external_atp_id",
      });
      continue;
    }

    resolvedMatches.push({
      ...match,
      playerAExternalAtpId: playerA.external_atp_id,
      playerBExternalAtpId: playerB.external_atp_id,
    });
  }

  if (autoCreatedMappings.length > 0) {
    const { error } = await client.from("player_external_ids").upsert(autoCreatedMappings, {
      onConflict: "provider,external_player_id",
      ignoreDuplicates: false,
    });

    if (error) {
      throw new Error(`Failed to upsert player_external_ids: ${error.message}`);
    }
  }

  const feed = groupMatchesIntoFeed(resolvedMatches);
  await writeFile(GENERATED_FEED_PATH, `${JSON.stringify(feed, null, 2)}\n`, "utf8");
  await writeFile(
    path.join(OUTPUT_DIR, "unresolved_players.json"),
    `${JSON.stringify(unresolvedPlayers, null, 2)}\n`,
    "utf8",
  );

  const summary: LiveSyncSummary = {
    provider: "matchstat-rapidapi",
    dateFrom,
    dateTo,
    fetchedMatches: providerMatches.length,
    supportedMatches: supportedProviderMatches.length,
    resolvedMatches: resolvedMatches.length,
    unresolvedPlayers: unresolvedPlayers.length,
    autoMappedPlayers: autoCreatedMappings.length,
    generatedFeedPath: GENERATED_FEED_PATH,
  };

  return summary;
}
