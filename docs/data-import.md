# Jeff Sackmann Import Plan

## Current Status

As of Tuesday, July 21, 2026, the Jeff Sackmann ATP dataset has been downloaded into this workspace from the Hugging Face archival mirror.

The local dataset currently includes:

- main-draw ATP match files from `1968` through `2026`
- `atp_players.csv`
- historical ATP ranking files by decade plus `atp_rankings_current.csv`
- `matches_data_dictionary.txt`
- `UPSTREAM_README.md`

## Why We Are Starting With Local Files

The Jeff Sackmann data is our historical source, but the import workflow should not depend on the frontend's public Supabase key.

That means:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is for the web app
- historical imports should use a server-side secret or direct Postgres connection
- we should validate and normalize the CSVs before writing into production tables

## Source of Truth

Primary source for Phase 1:

- Hugging Face mirror: [Aneeshers/tennis-sackmann-archive](https://huggingface.co/datasets/Aneeshers/tennis-sackmann-archive)

Reason for using the mirror:

- the original `JeffSackmann/tennis_atp` repository was not reliably accessible from this environment
- the mirror preserves the upstream ATP README for provenance
- the mirror exposes the same ATP files through 2026

## Expected Source Layout

ATP CSV files live here:

`data/jeff-sackmann/atp/`

Examples:

- `atp_matches_2024.csv`
- `atp_matches_2025.csv`
- `atp_matches_2026.csv`
- `atp_players.csv`
- `atp_rankings_20s.csv`

## First Validation Command

After installing dependencies, run:

```bash
npm run inspect:sackmann
```

This will report:

- filename
- inferred season
- row count
- surfaces found
- tournament levels found

## Staging Preparation

After validation, prepare load-ready staging files with:

```bash
npm run prepare:sackmann-staging
```

This writes JSONL files to:

`work/staging/jeff-sackmann/`

Files produced:

- `players.jsonl`
- `rankings.jsonl`
- `matches_main_draw.jsonl`
- `summary.json`

These files are designed to load into the `staging.*` Supabase tables before normalization into the production schema.

## Active Modeling Window

The raw archive remains intact, but the active modeling dataset is intentionally restricted to the most recent 10 years.

Current active-history reference date:

- `2026-07-21`

Current cutoff:

- `2016-07-21`

Prepare the active-history outputs with:

```bash
npm run prepare:active-history
```

This writes production-shaped JSONL files to:

`work/normalized/active-atp/`

Files produced:

- `players.jsonl`
- `tournaments.jsonl`
- `matches.jsonl`
- `match_entries.jsonl`
- `player_match_stats.jsonl`
- `summary.json`

This layer is where we enforce:

- the rolling 10-year history window
- supported ATP surfaces
- normalized tournament-level mapping from Sackmann source codes
- source-compatible round handling, including `BR` and `RR` where they appear in ATP data

## Production Load

To load the normalized active-history dataset into Supabase production tables, use:

```bash
npm run load:active-history
```

Requirements:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

The public anon key is not used for this step.

## Elo Backfill

After the active-history dataset is loaded, compute ratings locally with:

```bash
npm run compute:elo-backfill
```

This writes Elo outputs to:

`work/ratings/elo-backfill/`

Files produced:

- `current_ratings.jsonl`
- `rating_history.jsonl`
- `summary.json`

Current Elo model behavior:

- starts every player at `1500`
- updates overall Elo after every match
- updates the relevant surface Elo after every match
- uses tournament-level K-factors
- stores end-of-day rating snapshots per player

To load the Elo results into Supabase, run:

```bash
npm run load:elo-backfill
```

## Historical Match Features

To generate pre-match historical features for explainable ATP prediction and backtesting, run:

```bash
npm run compute:historical-features
```

This writes outputs to:

`work/features/atp-match-features/`

Files produced:

- `historical_match_features.jsonl`
- `summary.json`

Current feature set:

- overall Elo
- surface Elo
- recent form
- surface win rate
- opponent quality
- rest days
- head-to-head

Historical rows are leakage-safe:

- `player_a_id` and `player_b_id` are assigned by sorted player ID
- the actual result is stored separately as `actual_winner_id`

To load historical feature rows into Supabase, first run this migration:

- `supabase/migrations/20260721_005_match_feature_snapshots.sql`

Then run:

```bash
npm run load:historical-features
```

## Recommended Next Build Order

1. Run the inspection script locally.
2. Prepare staging JSONL from the local ATP dataset.
3. Create staging tables in Supabase for raw rows.
4. Build the active-history normalized dataset for the last 10 years.
5. Load normalized players, tournaments, matches, and stats into the core schema.
6. Backfill Elo and derived features from historical results.
7. Add qualifying/challenger files only if the baseline feature set benefits from them.

## Upcoming Match Demo Pipeline

Before we wire in a live ATP schedule API, we now have a local upcoming-match contract for development:

`data/upcoming-matches/atp-upcoming.sample.json`

Run:

```bash
npm run compute:upcoming-matches
```

This writes:

`work/upcoming/atp/`

Files produced:

- `upcoming_matches.jsonl`
- `upcoming_match_feature_snapshots.jsonl`
- `upcoming_match_predictions.jsonl`
- `summary.json`

What this does:

- reads a scheduled-match feed
- maps external ATP player IDs onto our normalized player records
- rebuilds current player state from the 10-year active ATP history
- generates explainable pre-match features
- scores each match with the same baseline model used for historical backtests

To persist these demo upcoming predictions in Supabase, first run this migration:

- `supabase/migrations/20260721_006_upcoming_matches.sql`

Then run:

```bash
npm run load:upcoming-matches
```

This upcoming pipeline is intentionally a placeholder:

- it is not a live schedule source yet
- it keeps future scheduled matches separate from completed historical matches
- it gives us the right database and application contract for the future live-ingestion job

## RapidAPI Live ATP Sync

We now have a real provider adapter for:

- `tennis-api-atp-wta-itf.p.rapidapi.com`

Required environment variables:

```bash
RAPIDAPI_TENNIS_KEY=your_rapidapi_key
RAPIDAPI_TENNIS_HOST=tennis-api-atp-wta-itf.p.rapidapi.com
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_URL=your_project_url
```

Before the first live sync, run this Supabase migration:

- `supabase/migrations/20260721_007_player_external_ids.sql`

Then run:

```bash
npm run sync:rapidapi-upcoming
```

Default sync window:

- `2026-07-21` through `2026-07-28`

This script:

- fetches ATP singles fixtures from RapidAPI
- resolves provider player IDs against our internal players
- stores persistent provider-to-player mappings in `player_external_ids`
- writes a generated feed to `data/upcoming-matches/atp-upcoming.generated.json`
- regenerates feature snapshots and probabilities in `work/upcoming/atp/`

If player matching is ambiguous, unresolved records are written to:

- `work/upcoming/atp/unresolved_players.json`

That lets us keep the ingestion deterministic instead of silently guessing the wrong player.

Manual provider-name overrides live here:

- `data/config/upcoming-player-overrides.json`

Use this file for:

- safe alias mappings where the provider uses a longer or alternate player name
- explicit ignore rules when a provider player is outside the current active ATP player set
