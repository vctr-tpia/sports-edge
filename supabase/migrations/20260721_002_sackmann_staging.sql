create schema if not exists staging;

create table if not exists staging.atp_players_raw (
  source_player_id text primary key,
  first_name text not null,
  last_name text not null,
  full_name text not null,
  handedness public.handedness_type,
  birth_date date,
  country_code text,
  height_cm integer,
  wikidata_id text,
  source_file text not null,
  imported_at timestamptz not null default now()
);

create table if not exists staging.atp_rankings_raw (
  ranking_date date not null,
  rank integer not null,
  source_player_id text not null,
  ranking_points integer,
  source_file text not null,
  imported_at timestamptz not null default now(),
  primary key (ranking_date, source_player_id)
);

create table if not exists staging.atp_matches_main_draw_raw (
  external_match_id text primary key,
  external_tournament_id text not null,
  tournament_name text not null,
  surface text,
  draw_size integer,
  tournament_level_code text not null,
  tournament_date date,
  match_num integer,
  winner_player_id text not null,
  loser_player_id text not null,
  winner_name text not null,
  loser_name text not null,
  score text,
  best_of integer,
  round_code text not null,
  minutes integer,
  winner_rank integer,
  winner_rank_points integer,
  loser_rank integer,
  loser_rank_points integer,
  raw_row jsonb not null,
  source_file text not null,
  imported_at timestamptz not null default now()
);

create index if not exists atp_rankings_raw_player_idx
  on staging.atp_rankings_raw (source_player_id, ranking_date desc);

create index if not exists atp_matches_main_draw_raw_tournament_idx
  on staging.atp_matches_main_draw_raw (external_tournament_id);

create index if not exists atp_matches_main_draw_raw_date_idx
  on staging.atp_matches_main_draw_raw (tournament_date desc);
