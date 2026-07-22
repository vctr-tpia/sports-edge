import type { MatchRound, Surface, TournamentLevel } from "@/src/domain/shared";

export type UpcomingFeed = {
  generatedAt: string;
  source: string;
  tournaments: UpcomingTournamentInput[];
};

export type UpcomingTournamentInput = {
  externalTournamentId: string;
  name: string;
  season: number;
  countryCode: string | null;
  city: string | null;
  surface: Surface;
  level: TournamentLevel;
  startDate: string;
  endDate: string;
  matches: UpcomingMatchInput[];
};

export type UpcomingMatchInput = {
  externalMatchId: string;
  matchDate: string;
  scheduledAt: string | null;
  providerTimeLabel: string | null;
  round: MatchRound;
  bestOf: number;
  playerAExternalAtpId: string;
  playerBExternalAtpId: string;
};

export type UpcomingMatchRow = {
  id: string;
  external_match_id: string;
  external_tournament_id: string;
  tournament_name: string;
  season: number;
  country_code: string | null;
  city: string | null;
  surface: Surface;
  tournament_level: TournamentLevel;
  match_date: string;
  scheduled_at: string | null;
  provider_time_label: string | null;
  tournament_start_date: string | null;
  tournament_end_date: string | null;
  round: MatchRound;
  best_of: number | null;
  player_a_id: string;
  player_b_id: string;
  source: string;
  status: "scheduled";
};

export type UpcomingFeatureRow = {
  upcoming_match_id: string;
  feature_version: string;
  match_date: string;
  surface: Surface;
  tournament_level: TournamentLevel;
  round: MatchRound;
  player_a_id: string;
  player_b_id: string;
  player_a_overall_elo: number;
  player_b_overall_elo: number;
  player_a_surface_elo: number;
  player_b_surface_elo: number;
  player_a_recent_form: number;
  player_b_recent_form: number;
  player_a_surface_recent_form: number;
  player_b_surface_recent_form: number;
  player_a_surface_service_points_won: number;
  player_b_surface_service_points_won: number;
  player_a_surface_return_points_won: number;
  player_b_surface_return_points_won: number;
  player_a_surface_win_rate: number;
  player_b_surface_win_rate: number;
  player_a_opponent_quality: number;
  player_b_opponent_quality: number;
  player_a_rest_days: number | null;
  player_b_rest_days: number | null;
  player_a_h2h_wins: number;
  player_b_h2h_wins: number;
  player_a_overall_elo_edge: number;
  player_a_surface_elo_edge: number;
  player_a_recent_form_edge: number;
  player_a_surface_recent_form_edge: number;
  player_a_surface_service_points_won_edge: number;
  player_a_surface_return_points_won_edge: number;
  player_a_surface_win_rate_edge: number;
  player_a_opponent_quality_edge: number;
  player_a_rest_days_edge: number | null;
  player_a_h2h_edge: number;
};

export type UpcomingPredictionRow = {
  upcoming_match_id: string;
  model_version: string;
  generated_at: string;
  favorite_player_id: string;
  player_a_id: string;
  player_b_id: string;
  player_a_win_probability: number;
  player_b_win_probability: number;
  confidence: number;
  expected_total_sets: number;
  expected_total_games: number;
  favorite_straight_sets_probability: number;
  deciding_set_probability: number;
};
