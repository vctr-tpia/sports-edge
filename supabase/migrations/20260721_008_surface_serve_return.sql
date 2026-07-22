alter table public.match_feature_snapshots
  add column if not exists player_a_surface_service_points_won numeric(6, 3),
  add column if not exists player_b_surface_service_points_won numeric(6, 3),
  add column if not exists player_a_surface_return_points_won numeric(6, 3),
  add column if not exists player_b_surface_return_points_won numeric(6, 3),
  add column if not exists player_a_surface_service_points_won_edge numeric(8, 3),
  add column if not exists player_a_surface_return_points_won_edge numeric(8, 3);

alter table public.upcoming_match_feature_snapshots
  add column if not exists player_a_surface_service_points_won numeric(6, 3),
  add column if not exists player_b_surface_service_points_won numeric(6, 3),
  add column if not exists player_a_surface_return_points_won numeric(6, 3),
  add column if not exists player_b_surface_return_points_won numeric(6, 3),
  add column if not exists player_a_surface_service_points_won_edge numeric(8, 3),
  add column if not exists player_a_surface_return_points_won_edge numeric(8, 3);
