create table if not exists public.upcoming_matches (
  id text primary key,
  external_match_id text unique not null,
  external_tournament_id text not null,
  tournament_name text not null,
  season integer not null,
  country_code text,
  city text,
  surface public.surface_type not null,
  tournament_level public.tournament_level_type not null,
  match_date date not null,
  round public.match_round_type not null,
  best_of integer,
  player_a_id uuid not null references public.players(id),
  player_b_id uuid not null references public.players(id),
  source text not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint upcoming_matches_distinct_players check (player_a_id <> player_b_id)
);

create table if not exists public.upcoming_match_feature_snapshots (
  upcoming_match_id text primary key references public.upcoming_matches(id) on delete cascade,
  feature_version text not null,
  match_date date not null,
  surface public.surface_type not null,
  tournament_level public.tournament_level_type not null,
  round public.match_round_type not null,
  player_a_id uuid not null references public.players(id),
  player_b_id uuid not null references public.players(id),
  player_a_overall_elo numeric(8, 2) not null,
  player_b_overall_elo numeric(8, 2) not null,
  player_a_surface_elo numeric(8, 2) not null,
  player_b_surface_elo numeric(8, 2) not null,
  player_a_recent_form numeric(6, 3) not null,
  player_b_recent_form numeric(6, 3) not null,
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
  player_a_surface_win_rate_edge numeric(8, 3) not null,
  player_a_opponent_quality_edge numeric(8, 3) not null,
  player_a_rest_days_edge integer,
  player_a_h2h_edge integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.upcoming_match_predictions (
  id uuid primary key default gen_random_uuid(),
  upcoming_match_id text not null references public.upcoming_matches(id) on delete cascade,
  model_version text not null,
  generated_at timestamptz not null,
  favorite_player_id uuid not null references public.players(id),
  player_a_id uuid not null references public.players(id),
  player_b_id uuid not null references public.players(id),
  player_a_win_probability numeric(6, 5) not null check (player_a_win_probability > 0 and player_a_win_probability < 1),
  player_b_win_probability numeric(6, 5) not null check (player_b_win_probability > 0 and player_b_win_probability < 1),
  confidence numeric(6, 5) not null check (confidence >= 0 and confidence <= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint upcoming_predictions_probabilities_sum check (
    round((player_a_win_probability + player_b_win_probability)::numeric, 5) = 1.00000
  ),
  unique (upcoming_match_id, model_version)
);

create index if not exists upcoming_matches_match_date_idx
  on public.upcoming_matches (match_date asc);

create index if not exists upcoming_matches_player_a_idx
  on public.upcoming_matches (player_a_id);

create index if not exists upcoming_matches_player_b_idx
  on public.upcoming_matches (player_b_id);

create index if not exists upcoming_predictions_generated_at_idx
  on public.upcoming_match_predictions (generated_at desc);

create trigger set_upcoming_matches_updated_at
before update on public.upcoming_matches
for each row
execute function public.set_updated_at();

create trigger set_upcoming_predictions_updated_at
before update on public.upcoming_match_predictions
for each row
execute function public.set_updated_at();
