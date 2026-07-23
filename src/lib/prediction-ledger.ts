import type {
  MatchPrediction,
  PredictionFactor,
  PredictionFactorKey,
} from "@/src/domain/predictions/explanation";
import type { HistoricalMatchFeatureSnapshot } from "@/src/domain/predictions/feature-snapshot";
import type { MatchRound, Surface, TournamentLevel } from "@/src/domain/shared";
import { env } from "@/src/lib/env";
import { getSupabaseAdminClient } from "@/src/lib/supabase-admin";
import { generatePredictionFromFeatureSnapshot } from "@/src/prediction/baseline-feature-model";

type NumericLike = number | string | null | undefined;

type PredictionLedgerEntryRow = {
  id: string;
  source_upcoming_match_id: string;
  tournament_name: string;
  surface: Surface;
  round: MatchRound;
  match_date: string;
  scheduled_at: string | null;
  provider_time_label: string | null;
  player_a_id: string;
  player_b_id: string;
  player_a_name: string;
  player_b_name: string;
  player_a_country_code: string | null;
  player_b_country_code: string | null;
  feature_version: string;
  tournament_level: TournamentLevel;
  best_of: number | null;
  player_a_overall_elo: NumericLike;
  player_b_overall_elo: NumericLike;
  player_a_surface_elo: NumericLike;
  player_b_surface_elo: NumericLike;
  player_a_recent_form: NumericLike;
  player_b_recent_form: NumericLike;
  player_a_surface_recent_form: NumericLike;
  player_b_surface_recent_form: NumericLike;
  player_a_surface_service_points_won: NumericLike;
  player_b_surface_service_points_won: NumericLike;
  player_a_surface_return_points_won: NumericLike;
  player_b_surface_return_points_won: NumericLike;
  player_a_surface_win_rate: NumericLike;
  player_b_surface_win_rate: NumericLike;
  player_a_opponent_quality: NumericLike;
  player_b_opponent_quality: NumericLike;
  player_a_rest_days: number | null;
  player_b_rest_days: number | null;
  player_a_h2h_wins: number;
  player_b_h2h_wins: number;
  player_a_overall_elo_edge: NumericLike;
  player_a_surface_elo_edge: NumericLike;
  player_a_recent_form_edge: NumericLike;
  player_a_surface_recent_form_edge: NumericLike;
  player_a_surface_service_points_won_edge: NumericLike;
  player_a_surface_return_points_won_edge: NumericLike;
  player_a_surface_win_rate_edge: NumericLike;
  player_a_opponent_quality_edge: NumericLike;
  player_a_rest_days_edge: number | null;
  player_a_h2h_edge: number;
  model_version: string;
  generated_at: string;
  favorite_player_id: string;
  favorite_player_name: string;
  player_a_win_probability: NumericLike;
  player_b_win_probability: NumericLike;
  confidence: NumericLike;
  expected_total_sets: NumericLike;
  expected_total_games: NumericLike;
  favorite_straight_sets_probability: NumericLike;
  deciding_set_probability: NumericLike;
  match_status: "completed" | "cancelled";
  prediction_result: "won" | "lost" | "void";
  settled_at: string | null;
  settled_score: string | null;
  settled_winner_id: string | null;
  settled_winner_name: string | null;
};

type PredictionLedgerFactorRow = {
  factor_key: string;
  factor_label: string;
  factor_weight: NumericLike;
  player_a_value: NumericLike;
  player_b_value: NumericLike;
  edge_to_player_a: NumericLike;
  explanation: string;
};

export type PredictionLedgerRecord = {
  matchId: string;
  tournamentName: string;
  surface: Surface;
  round: MatchRound;
  matchDate: string;
  scheduledAt: string | null;
  providerTimeLabel: string | null;
  playerAId: string;
  playerBId: string;
  playerAName: string;
  playerBName: string;
  playerACountryCode: string | null;
  playerBCountryCode: string | null;
  favoritePlayerId: string;
  favoritePlayerName: string;
  playerAWinProbability: number;
  playerBWinProbability: number;
  confidence: number;
  modelVersion: string;
  generatedAt: string;
  matchStatus: "completed" | "cancelled";
  predictionResult: "won" | "lost" | "void";
  settledAt: string | null;
  settledScore: string | null;
  settledWinnerId: string | null;
  settledWinnerName: string | null;
};

function ledgerEnabled() {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

function toNumber(value: NumericLike, fallback = 0) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value === "number") {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toPredictionFactor(row: PredictionLedgerFactorRow): PredictionFactor {
  return {
    key: row.factor_key as PredictionFactorKey,
    label: row.factor_label,
    weight: toNumber(row.factor_weight),
    playerAValue: toNumber(row.player_a_value),
    playerBValue: toNumber(row.player_b_value),
    edgeToPlayerA: toNumber(row.edge_to_player_a),
    summary: row.explanation,
  };
}

function toHistoricalSnapshot(row: PredictionLedgerEntryRow): HistoricalMatchFeatureSnapshot | null {
  if (row.match_status !== "completed" || !row.settled_winner_id) {
    return null;
  }

  const actualLoserId =
    row.settled_winner_id === row.player_a_id ? row.player_b_id : row.player_a_id;

  return {
    matchId: row.source_upcoming_match_id,
    featureVersion: row.feature_version,
    matchDate: row.match_date,
    tournamentId: row.source_upcoming_match_id,
    tournamentLevel: row.tournament_level,
    bestOf: row.best_of,
    surface: row.surface,
    round: row.round,
    playerAId: row.player_a_id,
    playerBId: row.player_b_id,
    actualWinnerId: row.settled_winner_id,
    actualLoserId,
    playerAOverallElo: toNumber(row.player_a_overall_elo),
    playerBOverallElo: toNumber(row.player_b_overall_elo),
    playerASurfaceElo: toNumber(row.player_a_surface_elo),
    playerBSurfaceElo: toNumber(row.player_b_surface_elo),
    playerARecentForm: toNumber(row.player_a_recent_form),
    playerBRecentForm: toNumber(row.player_b_recent_form),
    playerASurfaceRecentForm:
      row.player_a_surface_recent_form === null ? undefined : toNumber(row.player_a_surface_recent_form),
    playerBSurfaceRecentForm:
      row.player_b_surface_recent_form === null ? undefined : toNumber(row.player_b_surface_recent_form),
    playerASurfaceServicePointsWon:
      row.player_a_surface_service_points_won === null
        ? undefined
        : toNumber(row.player_a_surface_service_points_won),
    playerBSurfaceServicePointsWon:
      row.player_b_surface_service_points_won === null
        ? undefined
        : toNumber(row.player_b_surface_service_points_won),
    playerASurfaceReturnPointsWon:
      row.player_a_surface_return_points_won === null
        ? undefined
        : toNumber(row.player_a_surface_return_points_won),
    playerBSurfaceReturnPointsWon:
      row.player_b_surface_return_points_won === null
        ? undefined
        : toNumber(row.player_b_surface_return_points_won),
    playerASurfaceWinRate: toNumber(row.player_a_surface_win_rate),
    playerBSurfaceWinRate: toNumber(row.player_b_surface_win_rate),
    playerAOpponentQuality: toNumber(row.player_a_opponent_quality),
    playerBOpponentQuality: toNumber(row.player_b_opponent_quality),
    playerARestDays: row.player_a_rest_days,
    playerBRestDays: row.player_b_rest_days,
    playerAH2HWins: row.player_a_h2h_wins,
    playerBH2HWins: row.player_b_h2h_wins,
    playerAOverallEloEdge: toNumber(row.player_a_overall_elo_edge),
    playerASurfaceEloEdge: toNumber(row.player_a_surface_elo_edge),
    playerARecentFormEdge: toNumber(row.player_a_recent_form_edge),
    playerASurfaceRecentFormEdge:
      row.player_a_surface_recent_form_edge === null
        ? undefined
        : toNumber(row.player_a_surface_recent_form_edge),
    playerASurfaceServicePointsWonEdge:
      row.player_a_surface_service_points_won_edge === null
        ? undefined
        : toNumber(row.player_a_surface_service_points_won_edge),
    playerASurfaceReturnPointsWonEdge:
      row.player_a_surface_return_points_won_edge === null
        ? undefined
        : toNumber(row.player_a_surface_return_points_won_edge),
    playerASurfaceWinRateEdge: toNumber(row.player_a_surface_win_rate_edge),
    playerAOpponentQualityEdge: toNumber(row.player_a_opponent_quality_edge),
    playerARestDaysEdge: row.player_a_rest_days_edge,
    playerAH2HEdge: row.player_a_h2h_edge,
  };
}

export async function getPredictionLedgerEntries(): Promise<PredictionLedgerRecord[]> {
  if (!ledgerEnabled()) {
    return [];
  }

  try {
    const client = getSupabaseAdminClient();
    const { data, error } = await client
      .from("prediction_ledger_entries")
      .select(
        "source_upcoming_match_id,tournament_name,surface,round,match_date,scheduled_at,provider_time_label,player_a_id,player_b_id,player_a_name,player_b_name,player_a_country_code,player_b_country_code,favorite_player_id,favorite_player_name,player_a_win_probability,player_b_win_probability,confidence,model_version,generated_at,match_status,prediction_result,settled_at,settled_score,settled_winner_id,settled_winner_name",
      )
      .order("match_date", { ascending: false })
      .order("settled_at", { ascending: false, nullsFirst: false })
      .order("generated_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return ((data ?? []) as PredictionLedgerEntryRow[]).map((row) => ({
      matchId: row.source_upcoming_match_id,
      tournamentName: row.tournament_name,
      surface: row.surface,
      round: row.round,
      matchDate: row.match_date,
      scheduledAt: row.scheduled_at,
      providerTimeLabel: row.provider_time_label,
      playerAId: row.player_a_id,
      playerBId: row.player_b_id,
      playerAName: row.player_a_name,
      playerBName: row.player_b_name,
      playerACountryCode: row.player_a_country_code,
      playerBCountryCode: row.player_b_country_code,
      favoritePlayerId: row.favorite_player_id,
      favoritePlayerName: row.favorite_player_name,
      playerAWinProbability: toNumber(row.player_a_win_probability),
      playerBWinProbability: toNumber(row.player_b_win_probability),
      confidence: toNumber(row.confidence),
      modelVersion: row.model_version,
      generatedAt: row.generated_at,
      matchStatus: row.match_status,
      predictionResult: row.prediction_result,
      settledAt: row.settled_at,
      settledScore: row.settled_score,
      settledWinnerId: row.settled_winner_id,
      settledWinnerName: row.settled_winner_name,
    }));
  } catch (error) {
    if (error instanceof Error && error.message.includes("prediction_ledger_entries")) {
      return [];
    }

    throw error;
  }
}

export async function getArchivedPredictionMatchById(matchId: string): Promise<
  | {
      kind: "historical";
      match: {
        id: string;
        matchDate: string;
        tournamentName: string;
        city?: string | null;
        countryCode?: string | null;
        scheduledAt?: string | null;
        providerTimeLabel?: string | null;
        tournamentStartDate?: string | null;
        tournamentEndDate?: string | null;
        bestOf?: number | null;
      };
      snapshot: HistoricalMatchFeatureSnapshot;
      prediction: MatchPrediction;
      actualWinnerName?: string | null;
    }
  | null
> {
  if (!ledgerEnabled()) {
    return null;
  }

  try {
    const client = getSupabaseAdminClient();
    const { data, error } = await client
      .from("prediction_ledger_entries")
      .select(
        "id,source_upcoming_match_id,tournament_name,city,country_code,match_date,scheduled_at,provider_time_label,tournament_start_date,tournament_end_date,best_of,feature_version,tournament_level,surface,round,player_a_id,player_b_id,player_a_name,player_b_name,player_a_country_code,player_b_country_code,player_a_overall_elo,player_b_overall_elo,player_a_surface_elo,player_b_surface_elo,player_a_recent_form,player_b_recent_form,player_a_surface_recent_form,player_b_surface_recent_form,player_a_surface_service_points_won,player_b_surface_service_points_won,player_a_surface_return_points_won,player_b_surface_return_points_won,player_a_surface_win_rate,player_b_surface_win_rate,player_a_opponent_quality,player_b_opponent_quality,player_a_rest_days,player_b_rest_days,player_a_h2h_wins,player_b_h2h_wins,player_a_overall_elo_edge,player_a_surface_elo_edge,player_a_recent_form_edge,player_a_surface_recent_form_edge,player_a_surface_service_points_won_edge,player_a_surface_return_points_won_edge,player_a_surface_win_rate_edge,player_a_opponent_quality_edge,player_a_rest_days_edge,player_a_h2h_edge,model_version,generated_at,favorite_player_id,favorite_player_name,player_a_win_probability,player_b_win_probability,confidence,expected_total_sets,expected_total_games,favorite_straight_sets_probability,deciding_set_probability,match_status,prediction_result,settled_at,settled_score,settled_winner_id,settled_winner_name",
      )
      .eq("source_upcoming_match_id", matchId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return null;
    }

    const row = data as PredictionLedgerEntryRow & {
      city?: string | null;
      country_code?: string | null;
      tournament_start_date?: string | null;
      tournament_end_date?: string | null;
    };
    const snapshot = toHistoricalSnapshot(row);

    if (!snapshot) {
      return null;
    }

    const { data: factorRows, error: factorsError } = await client
      .from("prediction_ledger_factors")
      .select(
        "factor_key,factor_label,factor_weight,player_a_value,player_b_value,edge_to_player_a,explanation",
      )
      .eq("ledger_entry_id", row.id)
      .order("id", { ascending: true });

    if (factorsError) {
      throw new Error(factorsError.message);
    }

    const regenerated = generatePredictionFromFeatureSnapshot(snapshot);
    const explanation =
      factorRows && factorRows.length > 0
        ? (factorRows as PredictionLedgerFactorRow[]).map(toPredictionFactor)
        : regenerated.explanation;

    return {
      kind: "historical",
      match: {
        id: row.source_upcoming_match_id,
        matchDate: row.match_date,
        tournamentName: row.tournament_name,
        city: row.city ?? null,
        countryCode: row.country_code ?? null,
        scheduledAt: row.scheduled_at,
        providerTimeLabel: row.provider_time_label,
        tournamentStartDate: row.tournament_start_date ?? null,
        tournamentEndDate: row.tournament_end_date ?? null,
        bestOf: row.best_of,
      },
      snapshot,
      prediction: {
        matchId: row.source_upcoming_match_id,
        modelVersion: row.model_version,
        playerAWinProbability: toNumber(row.player_a_win_probability),
        playerBWinProbability: toNumber(row.player_b_win_probability),
        confidence: toNumber(row.confidence),
        favoritePlayerId: row.favorite_player_id,
        explanation,
        projection: {
          expectedTotalSets: toNumber(row.expected_total_sets),
          expectedTotalGames: toNumber(row.expected_total_games),
          favoriteStraightSetsProbability: toNumber(row.favorite_straight_sets_probability),
          decidingSetProbability: toNumber(row.deciding_set_probability),
        },
        generatedAt: row.generated_at,
      },
      actualWinnerName: row.settled_winner_name ?? null,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("prediction_ledger_")) {
      return null;
    }

    throw error;
  }

}
