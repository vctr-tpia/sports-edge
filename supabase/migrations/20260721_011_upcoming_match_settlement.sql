alter table public.upcoming_matches
  add column if not exists settled_at timestamptz,
  add column if not exists settled_score text,
  add column if not exists settled_winner_id uuid references public.players(id),
  add column if not exists settlement_source text,
  add column if not exists settlement_provider_status text,
  add column if not exists settlement_event_id text;

create index if not exists upcoming_matches_status_match_date_idx
  on public.upcoming_matches (status, match_date asc);
