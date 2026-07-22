create extension if not exists "pgcrypto";

create type public.surface_type as enum ('clay', 'hard', 'grass');
create type public.handedness_type as enum ('right', 'left', 'unknown');
create type public.tournament_level_type as enum (
  'grand_slam',
  'masters',
  'atp_500',
  'atp_250',
  'challenger'
);
create type public.match_round_type as enum ('R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F');
create type public.prediction_result_type as enum ('pending', 'won', 'lost');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.players (
  id uuid primary key default gen_random_uuid(),
  external_atp_id text unique,
  full_name text not null,
  country_code text,
  birth_date date,
  handedness public.handedness_type not null default 'unknown',
  backhand_style text,
  height_cm integer,
  current_rank integer,
  current_rank_points integer,
  overall_elo numeric(8, 2) not null default 1500,
  clay_elo numeric(8, 2) not null default 1500,
  hard_elo numeric(8, 2) not null default 1500,
  grass_elo numeric(8, 2) not null default 1500,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  external_tournament_id text unique,
  name text not null,
  season integer not null,
  country_code text,
  city text,
  surface public.surface_type not null,
  level public.tournament_level_type not null,
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  external_match_id text unique,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  match_date date not null,
  round public.match_round_type not null,
  surface public.surface_type not null,
  best_of integer,
  winner_id uuid references public.players(id),
  loser_id uuid references public.players(id),
  score text,
  minutes integer,
  created_at timestamptz not null default now(),
  constraint matches_distinct_players check (winner_id is null or loser_id is null or winner_id <> loser_id)
);

create table public.match_entries (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  side text not null check (side in ('A', 'B')),
  seed integer,
  ranking_at_match integer,
  ranking_points_at_match integer,
  rest_days integer,
  created_at timestamptz not null default now(),
  unique (match_id, player_id),
  unique (match_id, side)
);

create table public.player_match_stats (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  aces integer,
  double_faults integer,
  first_serve_in_pct numeric(5, 2),
  first_serve_points_won_pct numeric(5, 2),
  second_serve_points_won_pct numeric(5, 2),
  break_points_saved_pct numeric(5, 2),
  break_points_converted_pct numeric(5, 2),
  service_points_won_pct numeric(5, 2),
  return_points_won_pct numeric(5, 2),
  created_at timestamptz not null default now(),
  unique (match_id, player_id)
);

create table public.player_ratings_history (
  id bigserial primary key,
  player_id uuid not null references public.players(id) on delete cascade,
  rating_date date not null,
  overall_elo numeric(8, 2) not null,
  clay_elo numeric(8, 2) not null,
  hard_elo numeric(8, 2) not null,
  grass_elo numeric(8, 2) not null,
  recent_form_index numeric(6, 3),
  created_at timestamptz not null default now(),
  unique (player_id, rating_date)
);

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  model_version text not null,
  generated_at timestamptz not null,
  favorite_player_id uuid not null references public.players(id),
  player_a_id uuid not null references public.players(id),
  player_b_id uuid not null references public.players(id),
  player_a_win_probability numeric(6, 5) not null check (player_a_win_probability > 0 and player_a_win_probability < 1),
  player_b_win_probability numeric(6, 5) not null check (player_b_win_probability > 0 and player_b_win_probability < 1),
  confidence numeric(6, 5) not null check (confidence >= 0 and confidence <= 1),
  market_player_a_probability numeric(6, 5),
  market_player_b_probability numeric(6, 5),
  edge_to_player_a numeric(6, 5),
  edge_to_player_b numeric(6, 5),
  result public.prediction_result_type not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint predictions_probabilities_sum check (
    round((player_a_win_probability + player_b_win_probability)::numeric, 5) = 1.00000
  ),
  unique (match_id, model_version)
);

create table public.prediction_factors (
  id bigserial primary key,
  prediction_id uuid not null references public.predictions(id) on delete cascade,
  factor_key text not null,
  factor_label text not null,
  factor_weight numeric(6, 5) not null,
  player_a_value numeric(10, 4) not null,
  player_b_value numeric(10, 4) not null,
  edge_to_player_a numeric(10, 5) not null,
  explanation text not null,
  created_at timestamptz not null default now()
);

create table public.model_runs (
  id uuid primary key default gen_random_uuid(),
  model_version text not null,
  run_started_at timestamptz not null,
  run_completed_at timestamptz,
  status text not null check (status in ('running', 'completed', 'failed')),
  matches_scored integer not null default 0,
  notes text
);

create index players_rank_idx on public.players(current_rank);
create index tournaments_season_idx on public.tournaments(season);
create index matches_date_idx on public.matches(match_date desc);
create index matches_tournament_idx on public.matches(tournament_id);
create index match_entries_player_idx on public.match_entries(player_id);
create index ratings_history_player_date_idx on public.player_ratings_history(player_id, rating_date desc);
create index predictions_generated_at_idx on public.predictions(generated_at desc);
create index predictions_match_model_idx on public.predictions(match_id, model_version);
create index prediction_factors_prediction_idx on public.prediction_factors(prediction_id);

create trigger set_players_updated_at
before update on public.players
for each row
execute function public.set_updated_at();

create trigger set_predictions_updated_at
before update on public.predictions
for each row
execute function public.set_updated_at();
