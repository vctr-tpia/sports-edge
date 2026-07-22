alter table public.upcoming_matches
  add column if not exists scheduled_at timestamptz,
  add column if not exists provider_time_label text,
  add column if not exists tournament_start_date date,
  add column if not exists tournament_end_date date;
