create table if not exists public.prediction_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  source_upcoming_match_id text not null,
  external_match_id text,
  external_tournament_id text not null,
  tournament_name text not null,
  season integer not null,
  country_code text,
  city text,
  surface public.surface_type not null,
  tournament_level public.tournament_level_type not null,
  match_date date not null,
  scheduled_at timestamptz,
  provider_time_label text,
  tournament_start_date date,
  tournament_end_date date,
  round public.match_round_type not null,
  best_of integer,
  source text not null,
  match_status text not null check (match_status in ('completed', 'cancelled')),
  player_a_id uuid not null references public.players(id),
  player_b_id uuid not null references public.players(id),
  player_a_name text not null,
  player_b_name text not null,
  player_a_country_code text,
  player_b_country_code text,
  feature_version text not null,
  player_a_overall_elo numeric(8, 2) not null,
  player_b_overall_elo numeric(8, 2) not null,
  player_a_surface_elo numeric(8, 2) not null,
  player_b_surface_elo numeric(8, 2) not null,
  player_a_recent_form numeric(6, 3) not null,
  player_b_recent_form numeric(6, 3) not null,
  player_a_surface_recent_form numeric(6, 3),
  player_b_surface_recent_form numeric(6, 3),
  player_a_surface_service_points_won numeric(6, 3),
  player_b_surface_service_points_won numeric(6, 3),
  player_a_surface_return_points_won numeric(6, 3),
  player_b_surface_return_points_won numeric(6, 3),
  player_a_surface_win_rate numeric(6, 3) not null,
  player_b_surface_win_rate numeric(6, 3) not null,
  player_a_opponent_quality numeric(8, 3) not null,
  player_b_opponent_quality numeric(8, 3) not null,
  player_a_rest_days integer,
  player_b_rest_days integer,
  player_a_h2h_wins integer not null,
  player_b_h2h_wins integer not null,
  player_a_overall_elo_edge numeric(8, 3) not null,
  player_a_surface_elo_edge numeric(8, 3) not null,
  player_a_recent_form_edge numeric(8, 3) not null,
  player_a_surface_recent_form_edge numeric(8, 3),
  player_a_surface_service_points_won_edge numeric(8, 3),
  player_a_surface_return_points_won_edge numeric(8, 3),
  player_a_surface_win_rate_edge numeric(8, 3) not null,
  player_a_opponent_quality_edge numeric(8, 3) not null,
  player_a_rest_days_edge integer,
  player_a_h2h_edge integer not null,
  model_version text not null,
  generated_at timestamptz not null,
  favorite_player_id uuid not null references public.players(id),
  favorite_player_name text not null,
  player_a_win_probability numeric(6, 5) not null check (player_a_win_probability > 0 and player_a_win_probability < 1),
  player_b_win_probability numeric(6, 5) not null check (player_b_win_probability > 0 and player_b_win_probability < 1),
  confidence numeric(6, 5) not null check (confidence >= 0 and confidence <= 1),
  expected_total_sets numeric(6, 3) not null,
  expected_total_games numeric(6, 3) not null,
  favorite_straight_sets_probability numeric(6, 5) not null,
  deciding_set_probability numeric(6, 5) not null,
  settled_at timestamptz,
  settled_score text,
  settled_winner_id uuid references public.players(id),
  settled_winner_name text,
  settlement_source text,
  settlement_provider_status text,
  settlement_event_id text,
  prediction_result text not null check (prediction_result in ('won', 'lost', 'void')),
  archived_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prediction_ledger_probabilities_sum check (
    round((player_a_win_probability + player_b_win_probability)::numeric, 5) = 1.00000
  ),
  unique (source_upcoming_match_id, model_version)
);

create table if not exists public.prediction_ledger_factors (
  id bigserial primary key,
  ledger_entry_id uuid not null references public.prediction_ledger_entries(id) on delete cascade,
  factor_key text not null,
  factor_label text not null,
  factor_weight numeric(6, 5) not null,
  player_a_value numeric(10, 4) not null,
  player_b_value numeric(10, 4) not null,
  edge_to_player_a numeric(10, 5) not null,
  explanation text not null,
  created_at timestamptz not null default now()
);

create index if not exists prediction_ledger_entries_match_date_idx
  on public.prediction_ledger_entries (match_date desc, settled_at desc);

create index if not exists prediction_ledger_entries_result_idx
  on public.prediction_ledger_entries (prediction_result, settled_at desc);

create index if not exists prediction_ledger_entries_favorite_idx
  on public.prediction_ledger_entries (favorite_player_id);

create index if not exists prediction_ledger_factors_entry_idx
  on public.prediction_ledger_factors (ledger_entry_id);

create trigger set_prediction_ledger_entries_updated_at
before update on public.prediction_ledger_entries
for each row
execute function public.set_updated_at();
