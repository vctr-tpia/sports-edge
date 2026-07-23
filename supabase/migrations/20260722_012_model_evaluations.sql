create table if not exists public.model_evaluations (
  id uuid primary key default gen_random_uuid(),
  model_run_id uuid not null unique references public.model_runs(id) on delete cascade,
  evaluation_version text not null unique,
  primary_model_version text not null,
  generated_at timestamptz not null,
  sample_match_count integer not null,
  sample_date_from date,
  sample_date_to date,
  overall_accuracy numeric(6, 5) not null,
  overall_log_loss numeric(8, 5) not null,
  overall_brier_score numeric(8, 5) not null,
  overall_calibration_error numeric(8, 5) not null,
  overall_average_confidence numeric(6, 5) not null,
  overall_average_favorite_win_probability numeric(6, 5) not null,
  overall_favorite_win_rate numeric(6, 5) not null,
  best_accuracy_model_version text,
  best_log_loss_model_version text,
  best_brier_model_version text,
  best_calibration_model_version text,
  notes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.model_evaluation_calibration_buckets (
  id bigserial primary key,
  evaluation_id uuid not null references public.model_evaluations(id) on delete cascade,
  sort_order integer not null,
  bucket_label text not null,
  probability_from numeric(4, 2) not null,
  probability_to numeric(4, 2) not null,
  match_count integer not null,
  average_predicted_win_probability numeric(6, 5) not null,
  actual_favorite_win_rate numeric(6, 5) not null,
  average_confidence numeric(6, 5) not null,
  created_at timestamptz not null default now(),
  unique (evaluation_id, bucket_label)
);

create table if not exists public.model_evaluation_segments (
  id bigserial primary key,
  evaluation_id uuid not null references public.model_evaluations(id) on delete cascade,
  segment_type text not null check (
    segment_type in (
      'surface',
      'tournament_level',
      'best_of',
      'ranking_gap_bucket',
      'favorite_probability_bucket',
      'season'
    )
  ),
  segment_key text not null,
  sort_order integer not null,
  match_count integer not null,
  accuracy numeric(6, 5) not null,
  log_loss numeric(8, 5) not null,
  brier_score numeric(8, 5) not null,
  average_confidence numeric(6, 5) not null,
  created_at timestamptz not null default now(),
  unique (evaluation_id, segment_type, segment_key)
);

create table if not exists public.model_evaluation_comparisons (
  id bigserial primary key,
  evaluation_id uuid not null references public.model_evaluations(id) on delete cascade,
  model_version text not null,
  model_family text not null check (model_family in ('full_model', 'benchmark', 'ablation')),
  match_count integer not null,
  accuracy numeric(6, 5) not null,
  log_loss numeric(8, 5) not null,
  brier_score numeric(8, 5) not null,
  calibration_error numeric(8, 5) not null,
  average_confidence numeric(6, 5) not null,
  average_favorite_win_probability numeric(6, 5) not null,
  favorite_win_rate numeric(6, 5) not null,
  created_at timestamptz not null default now(),
  unique (evaluation_id, model_version)
);

create table if not exists public.model_evaluation_segment_comparisons (
  id bigserial primary key,
  evaluation_id uuid not null references public.model_evaluations(id) on delete cascade,
  segment_type text not null check (
    segment_type in ('surface', 'tournament_level', 'best_of')
  ),
  segment_key text not null,
  sort_order integer not null,
  model_version text not null,
  model_family text not null check (model_family in ('full_model', 'benchmark', 'ablation')),
  match_count integer not null,
  accuracy numeric(6, 5) not null,
  log_loss numeric(8, 5) not null,
  brier_score numeric(8, 5) not null,
  average_confidence numeric(6, 5) not null,
  created_at timestamptz not null default now(),
  unique (evaluation_id, segment_type, segment_key, model_version)
);

create table if not exists public.model_evaluation_ablations (
  id bigserial primary key,
  evaluation_id uuid not null references public.model_evaluations(id) on delete cascade,
  sort_order integer not null,
  omitted_factor text not null,
  omitted_label text not null,
  match_count integer not null,
  accuracy numeric(6, 5) not null,
  log_loss numeric(8, 5) not null,
  brier_score numeric(8, 5) not null,
  calibration_error numeric(8, 5) not null,
  average_confidence numeric(6, 5) not null,
  accuracy_delta_vs_primary numeric(8, 5) not null,
  log_loss_delta_vs_primary numeric(8, 5) not null,
  brier_delta_vs_primary numeric(8, 5) not null,
  calibration_delta_vs_primary numeric(8, 5) not null,
  created_at timestamptz not null default now(),
  unique (evaluation_id, omitted_factor)
);

create index if not exists model_evaluations_generated_at_idx
  on public.model_evaluations (generated_at desc);

create index if not exists model_evaluation_calibration_evaluation_idx
  on public.model_evaluation_calibration_buckets (evaluation_id, sort_order);

create index if not exists model_evaluation_segments_lookup_idx
  on public.model_evaluation_segments (evaluation_id, segment_type, sort_order);

create index if not exists model_evaluation_comparisons_lookup_idx
  on public.model_evaluation_comparisons (evaluation_id, accuracy desc);

create index if not exists model_evaluation_segment_comparisons_lookup_idx
  on public.model_evaluation_segment_comparisons (evaluation_id, segment_type, sort_order);

create index if not exists model_evaluation_ablations_lookup_idx
  on public.model_evaluation_ablations (evaluation_id, sort_order);
