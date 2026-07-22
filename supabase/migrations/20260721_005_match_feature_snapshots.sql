create table if not exists public.match_feature_snapshots (
  match_id uuid primary key references public.matches(id) on delete cascade,
  feature_version text not null,
  match_date date not null,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  tournament_level public.tournament_level_type not null,
  surface public.surface_type not null,
  round public.match_round_type not null,
  player_a_id uuid not null references public.players(id),
  player_b_id uuid not null references public.players(id),
  actual_winner_id uuid not null references public.players(id),
  actual_loser_id uuid not null references public.players(id),
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

create index if not exists match_feature_snapshots_match_date_idx
  on public.match_feature_snapshots (match_date desc);

create index if not exists match_feature_snapshots_player_a_idx
  on public.match_feature_snapshots (player_a_id);

create index if not exists match_feature_snapshots_player_b_idx
  on public.match_feature_snapshots (player_b_id);
