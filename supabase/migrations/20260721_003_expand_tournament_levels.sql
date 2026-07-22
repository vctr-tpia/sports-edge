alter type public.tournament_level_type add value if not exists 'tour';
alter type public.tournament_level_type add value if not exists 'finals';
alter type public.tournament_level_type add value if not exists 'team_event';
alter type public.tournament_level_type add value if not exists 'olympics';

alter table public.tournaments
add column if not exists source_level_code text;
