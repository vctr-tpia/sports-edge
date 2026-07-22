import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { MatchRound, Surface, TournamentLevel } from "@/src/domain/shared";
import type {
  UpcomingFeatureRow,
  UpcomingFeed,
  UpcomingMatchRow,
  UpcomingPredictionRow,
} from "@/src/domain/upcoming";
import type {
  PreMatchFeatureSnapshot,
} from "@/src/domain/predictions/feature-snapshot";
import {
  loadActiveHistoricalDataset,
  loadActivePlayers,
  type ActiveMatch,
  type ActivePlayer,
  type ActivePlayerMatchStat,
  type ActiveTournament,
} from "@/src/lib/active-history";
import { generatePredictionFromFeatureSnapshot } from "@/src/prediction/baseline-feature-model";
import {
  applyMatchResult,
  averageOpponentQuality,
  getOrCreateState,
  pairKey,
  recentFormIndex,
  recentSurfaceReturnPointsWon,
  recentSurfaceFormIndex,
  recentSurfaceServicePointsWon,
  restDays,
  roundMetric,
  roundOrder,
  roundRating,
  surfaceWinRate,
  type PlayerFeatureState,
} from "@/src/prediction/feature-state";

const OUTPUT_DIR = path.join(process.cwd(), "work", "upcoming", "atp");
const GENERATED_INPUT_PATH = path.join(
  process.cwd(),
  "data",
  "upcoming-matches",
  "atp-upcoming.generated.json",
);
const SAMPLE_INPUT_PATH = path.join(
  process.cwd(),
  "data",
  "upcoming-matches",
  "atp-upcoming.sample.json",
);
const FEATURE_VERSION = "baseline-features-v5";

type UpcomingSummary = {
  generatedAt: string;
  source: string;
  tournamentCount: number;
  upcomingMatchCount: number;
  playerCount: number;
  dateRange: {
    from: string | null;
    to: string | null;
  };
};

async function readJsonLines<T>(filePath: string): Promise<T[]> {
  const content = await readFile(filePath, "utf8");
  return content
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

async function writeJsonLines<T>(filePath: string, rows: T[]) {
  const content = rows.map((row) => JSON.stringify(row)).join("\n");
  await writeFile(filePath, content.length > 0 ? `${content}\n` : "", "utf8");
}

async function resolveInputPath(inputPath?: string) {
  if (inputPath) {
    return inputPath;
  }

  try {
    await access(GENERATED_INPUT_PATH);
    return GENERATED_INPUT_PATH;
  } catch {
    return SAMPLE_INPUT_PATH;
  }
}

async function hydrateHistoricalState() {
  const { tournaments, matches, playerMatchStats } = await loadActiveHistoricalDataset();
  const tournamentById = new Map(tournaments.map((tournament) => [tournament.id, tournament]));
  const playerMatchStatByKey = new Map(
    playerMatchStats.map((row) => [`${row.match_id}:${row.player_id}`, row]),
  );
  const states = new Map<string, PlayerFeatureState>();
  const headToHead = new Map<string, Record<string, number>>();

  const sortedMatches = [...matches].sort((left, right) => {
    const byDate = left.match_date.localeCompare(right.match_date);
    if (byDate !== 0) {
      return byDate;
    }

    const byRound = roundOrder(left.round) - roundOrder(right.round);
    if (byRound !== 0) {
      return byRound;
    }

    return left.external_match_id.localeCompare(right.external_match_id);
  });

  for (const match of sortedMatches) {
    const tournament = tournamentById.get(match.tournament_id);
    if (!tournament) {
      continue;
    }

    const winnerState = getOrCreateState(states, match.winner_id);
    const loserState = getOrCreateState(states, match.loser_id);
    const h2hKey = pairKey(match.winner_id, match.loser_id);
    const record = headToHead.get(h2hKey) ?? {};
    record[match.winner_id] = (record[match.winner_id] ?? 0) + 1;
    record[match.loser_id] = record[match.loser_id] ?? 0;
    headToHead.set(h2hKey, record);

    applyMatchResult(
      winnerState,
      loserState,
      match,
      tournament,
      {
        servicePointsWonPct: playerMatchStatByKey.get(`${match.id}:${match.winner_id}`)?.service_points_won_pct ?? null,
        returnPointsWonPct: playerMatchStatByKey.get(`${match.id}:${match.winner_id}`)?.return_points_won_pct ?? null,
      },
      {
        servicePointsWonPct: playerMatchStatByKey.get(`${match.id}:${match.loser_id}`)?.service_points_won_pct ?? null,
        returnPointsWonPct: playerMatchStatByKey.get(`${match.id}:${match.loser_id}`)?.return_points_won_pct ?? null,
      },
    );
  }

  return {
    states,
    headToHead,
  };
}

function mapUpcomingSnapshot(row: UpcomingFeatureRow, bestOf?: number | null): PreMatchFeatureSnapshot {
  return {
    matchId: row.upcoming_match_id,
    featureVersion: row.feature_version,
    matchDate: row.match_date,
    tournamentId: row.upcoming_match_id,
    tournamentLevel: row.tournament_level,
    bestOf,
    surface: row.surface,
    round: row.round,
    playerAId: row.player_a_id,
    playerBId: row.player_b_id,
    playerAOverallElo: row.player_a_overall_elo,
    playerBOverallElo: row.player_b_overall_elo,
    playerASurfaceElo: row.player_a_surface_elo,
    playerBSurfaceElo: row.player_b_surface_elo,
    playerARecentForm: row.player_a_recent_form,
    playerBRecentForm: row.player_b_recent_form,
    playerASurfaceRecentForm: row.player_a_surface_recent_form,
    playerBSurfaceRecentForm: row.player_b_surface_recent_form,
    playerASurfaceServicePointsWon: row.player_a_surface_service_points_won,
    playerBSurfaceServicePointsWon: row.player_b_surface_service_points_won,
    playerASurfaceReturnPointsWon: row.player_a_surface_return_points_won,
    playerBSurfaceReturnPointsWon: row.player_b_surface_return_points_won,
    playerASurfaceWinRate: row.player_a_surface_win_rate,
    playerBSurfaceWinRate: row.player_b_surface_win_rate,
    playerAOpponentQuality: row.player_a_opponent_quality,
    playerBOpponentQuality: row.player_b_opponent_quality,
    playerARestDays: row.player_a_rest_days,
    playerBRestDays: row.player_b_rest_days,
    playerAH2HWins: row.player_a_h2h_wins,
    playerBH2HWins: row.player_b_h2h_wins,
    playerAOverallEloEdge: row.player_a_overall_elo_edge,
    playerASurfaceEloEdge: row.player_a_surface_elo_edge,
    playerARecentFormEdge: row.player_a_recent_form_edge,
    playerASurfaceRecentFormEdge: row.player_a_surface_recent_form_edge,
    playerASurfaceServicePointsWonEdge: row.player_a_surface_service_points_won_edge,
    playerASurfaceReturnPointsWonEdge: row.player_a_surface_return_points_won_edge,
    playerASurfaceWinRateEdge: row.player_a_surface_win_rate_edge,
    playerAOpponentQualityEdge: row.player_a_opponent_quality_edge,
    playerARestDaysEdge: row.player_a_rest_days_edge,
    playerAH2HEdge: row.player_a_h2h_edge,
  };
}

export async function computeUpcomingMatchPredictions(inputPath?: string) {
  await mkdir(OUTPUT_DIR, { recursive: true });
  for (const fileName of [
    "upcoming_matches.jsonl",
    "upcoming_match_feature_snapshots.jsonl",
    "upcoming_match_predictions.jsonl",
    "summary.json",
  ]) {
    await rm(path.join(OUTPUT_DIR, fileName), { force: true });
  }

  const resolvedInputPath = await resolveInputPath(inputPath);

  const [players, rawFeed, historicalState] = await Promise.all([
    loadActivePlayers(),
    readFile(resolvedInputPath, "utf8").then((content) => JSON.parse(content) as UpcomingFeed),
    hydrateHistoricalState(),
  ]);

  const playersByExternalId = new Map(players.map((player) => [player.external_atp_id, player]));
  const upcomingMatches: UpcomingMatchRow[] = [];
  const upcomingFeatures: UpcomingFeatureRow[] = [];
  const upcomingPredictions: UpcomingPredictionRow[] = [];

  for (const tournament of rawFeed.tournaments) {
    for (const match of tournament.matches) {
      const playerA = playersByExternalId.get(match.playerAExternalAtpId);
      const playerB = playersByExternalId.get(match.playerBExternalAtpId);

      if (!playerA || !playerB) {
        throw new Error(
          `Upcoming match ${match.externalMatchId} references unknown player external IDs.`,
        );
      }

      const playerAState = getOrCreateState(historicalState.states, playerA.id);
      const playerBState = getOrCreateState(historicalState.states, playerB.id);
      const h2hKey = pairKey(playerA.id, playerB.id);
      const h2hRecord = historicalState.headToHead.get(h2hKey) ?? {};
      const playerAH2HWins = h2hRecord[playerA.id] ?? 0;
      const playerBH2HWins = h2hRecord[playerB.id] ?? 0;
      const playerARestDays = restDays(playerAState.lastMatchDate, match.matchDate);
      const playerBRestDays = restDays(playerBState.lastMatchDate, match.matchDate);

      const upcomingMatch: UpcomingMatchRow = {
        id: match.externalMatchId,
        external_match_id: match.externalMatchId,
        external_tournament_id: tournament.externalTournamentId,
        tournament_name: tournament.name,
        season: tournament.season,
        country_code: tournament.countryCode,
        city: tournament.city,
        surface: tournament.surface,
        tournament_level: tournament.level,
        match_date: match.matchDate,
        scheduled_at: match.scheduledAt,
        provider_time_label: match.providerTimeLabel,
        tournament_start_date: tournament.startDate,
        tournament_end_date: tournament.endDate,
        round: match.round,
        best_of: match.bestOf,
        player_a_id: playerA.id,
        player_b_id: playerB.id,
        source: rawFeed.source,
        status: "scheduled",
      };

      const featureRow: UpcomingFeatureRow = {
        upcoming_match_id: upcomingMatch.id,
        feature_version: FEATURE_VERSION,
        match_date: match.matchDate,
        surface: tournament.surface,
        tournament_level: tournament.level,
        round: match.round,
        player_a_id: playerA.id,
        player_b_id: playerB.id,
        player_a_overall_elo: roundRating(playerAState.overallElo),
        player_b_overall_elo: roundRating(playerBState.overallElo),
        player_a_surface_elo: roundRating(playerAState.surfaceElos[tournament.surface]),
        player_b_surface_elo: roundRating(playerBState.surfaceElos[tournament.surface]),
        player_a_recent_form: recentFormIndex(playerAState.recentResults),
        player_b_recent_form: recentFormIndex(playerBState.recentResults),
        player_a_surface_recent_form: recentSurfaceFormIndex(playerAState, tournament.surface),
        player_b_surface_recent_form: recentSurfaceFormIndex(playerBState, tournament.surface),
        player_a_surface_service_points_won: recentSurfaceServicePointsWon(
          playerAState,
          tournament.surface,
        ),
        player_b_surface_service_points_won: recentSurfaceServicePointsWon(
          playerBState,
          tournament.surface,
        ),
        player_a_surface_return_points_won: recentSurfaceReturnPointsWon(
          playerAState,
          tournament.surface,
        ),
        player_b_surface_return_points_won: recentSurfaceReturnPointsWon(
          playerBState,
          tournament.surface,
        ),
        player_a_surface_win_rate: surfaceWinRate(playerAState, tournament.surface),
        player_b_surface_win_rate: surfaceWinRate(playerBState, tournament.surface),
        player_a_opponent_quality: averageOpponentQuality(playerAState.recentOpponentElos),
        player_b_opponent_quality: averageOpponentQuality(playerBState.recentOpponentElos),
        player_a_rest_days: playerARestDays,
        player_b_rest_days: playerBRestDays,
        player_a_h2h_wins: playerAH2HWins,
        player_b_h2h_wins: playerBH2HWins,
        player_a_overall_elo_edge: roundMetric(playerAState.overallElo - playerBState.overallElo),
        player_a_surface_elo_edge: roundMetric(
          playerAState.surfaceElos[tournament.surface] - playerBState.surfaceElos[tournament.surface],
        ),
        player_a_recent_form_edge: roundMetric(
          recentFormIndex(playerAState.recentResults) - recentFormIndex(playerBState.recentResults),
        ),
        player_a_surface_recent_form_edge: roundMetric(
          recentSurfaceFormIndex(playerAState, tournament.surface) -
            recentSurfaceFormIndex(playerBState, tournament.surface),
        ),
        player_a_surface_service_points_won_edge: roundMetric(
          recentSurfaceServicePointsWon(playerAState, tournament.surface) -
            recentSurfaceServicePointsWon(playerBState, tournament.surface),
        ),
        player_a_surface_return_points_won_edge: roundMetric(
          recentSurfaceReturnPointsWon(playerAState, tournament.surface) -
            recentSurfaceReturnPointsWon(playerBState, tournament.surface),
        ),
        player_a_surface_win_rate_edge: roundMetric(
          surfaceWinRate(playerAState, tournament.surface) -
            surfaceWinRate(playerBState, tournament.surface),
        ),
        player_a_opponent_quality_edge: roundMetric(
          averageOpponentQuality(playerAState.recentOpponentElos) -
            averageOpponentQuality(playerBState.recentOpponentElos),
        ),
        player_a_rest_days_edge:
          playerARestDays === null || playerBRestDays === null
            ? null
            : playerARestDays - playerBRestDays,
        player_a_h2h_edge: playerAH2HWins - playerBH2HWins,
      };

      const prediction = generatePredictionFromFeatureSnapshot(mapUpcomingSnapshot(featureRow, match.bestOf));

      upcomingMatches.push(upcomingMatch);
      upcomingFeatures.push(featureRow);
      upcomingPredictions.push({
        upcoming_match_id: upcomingMatch.id,
        model_version: prediction.modelVersion,
        generated_at: rawFeed.generatedAt,
        favorite_player_id: prediction.favoritePlayerId,
        player_a_id: playerA.id,
        player_b_id: playerB.id,
        player_a_win_probability: Number.parseFloat(prediction.playerAWinProbability.toFixed(5)),
        player_b_win_probability: Number.parseFloat(prediction.playerBWinProbability.toFixed(5)),
        confidence: Number.parseFloat(prediction.confidence.toFixed(5)),
        expected_total_sets: prediction.projection.expectedTotalSets,
        expected_total_games: prediction.projection.expectedTotalGames,
        favorite_straight_sets_probability: prediction.projection.favoriteStraightSetsProbability,
        deciding_set_probability: prediction.projection.decidingSetProbability,
      });
    }
  }

  const matchDates = upcomingMatches.map((match) => match.match_date).sort();
  const playerIds = new Set<string>();
  for (const match of upcomingMatches) {
    playerIds.add(match.player_a_id);
    playerIds.add(match.player_b_id);
  }

  const summary: UpcomingSummary = {
    generatedAt: rawFeed.generatedAt,
    source: rawFeed.source,
    tournamentCount: rawFeed.tournaments.length,
    upcomingMatchCount: upcomingMatches.length,
    playerCount: playerIds.size,
    dateRange: {
      from: matchDates[0] ?? null,
      to: matchDates.at(-1) ?? null,
    },
  };

  await Promise.all([
    writeJsonLines(path.join(OUTPUT_DIR, "upcoming_matches.jsonl"), upcomingMatches),
    writeJsonLines(path.join(OUTPUT_DIR, "upcoming_match_feature_snapshots.jsonl"), upcomingFeatures),
    writeJsonLines(path.join(OUTPUT_DIR, "upcoming_match_predictions.jsonl"), upcomingPredictions),
    writeFile(path.join(OUTPUT_DIR, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8"),
  ]);

  return summary;
}

export async function getLocalUpcomingPredictionSnapshots() {
  const [upcomingMatches, upcomingFeatures, upcomingPredictions] = await Promise.all([
    readJsonLines<UpcomingMatchRow>(path.join(OUTPUT_DIR, "upcoming_matches.jsonl")),
    readJsonLines<UpcomingFeatureRow>(path.join(OUTPUT_DIR, "upcoming_match_feature_snapshots.jsonl")),
    readJsonLines<UpcomingPredictionRow>(path.join(OUTPUT_DIR, "upcoming_match_predictions.jsonl")),
  ]);

  const featureByMatchId = new Map(upcomingFeatures.map((row) => [row.upcoming_match_id, row]));
  const predictionByMatchId = new Map(
    upcomingPredictions.map((row) => [row.upcoming_match_id, row]),
  );

  return upcomingMatches.map((match) => {
    const featureRow = featureByMatchId.get(match.id);
    const predictionRow = predictionByMatchId.get(match.id);
    if (!featureRow || !predictionRow) {
      throw new Error(`Missing upcoming feature or prediction row for ${match.id}`);
    }

    const snapshot = mapUpcomingSnapshot(featureRow, match.best_of);

    return {
      match,
      snapshot,
      prediction: generatePredictionFromFeatureSnapshot(snapshot),
    };
  });
}
