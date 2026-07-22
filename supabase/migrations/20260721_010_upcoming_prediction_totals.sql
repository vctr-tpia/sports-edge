alter table public.upcoming_match_predictions
  add column if not exists expected_total_sets numeric(6, 3) not null default 0,
  add column if not exists expected_total_games numeric(6, 3) not null default 0,
  add column if not exists favorite_straight_sets_probability numeric(6, 5) not null default 0,
  add column if not exists deciding_set_probability numeric(6, 5) not null default 0;
