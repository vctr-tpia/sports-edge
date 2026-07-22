create table if not exists public.player_external_ids (
  id bigserial primary key,
  provider text not null,
  external_player_id text not null,
  player_id uuid not null references public.players(id) on delete cascade,
  provider_player_name text,
  provider_country_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_player_id)
);

create index if not exists player_external_ids_player_idx
  on public.player_external_ids (player_id);

create trigger set_player_external_ids_updated_at
before update on public.player_external_ids
for each row
execute function public.set_updated_at();
