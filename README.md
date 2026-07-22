# Sports Edge

Sports Edge is an ATP-first sports analytics platform focused on explainable match prediction, not scoreboard coverage.

## MVP Scope

- Sport: ATP men's tennis only
- Core job: predict the winner of an ATP match
- Product requirement: every prediction must explain why the model prefers one player

## Stack

- Next.js
- TypeScript
- Tailwind CSS
- Supabase
- PostgreSQL

## Architecture

- `app/`: UI routes and presentation
- `components/`: shared UI building blocks
- `src/domain/`: tennis entities and prediction contracts
- `src/prediction/`: explainable baseline model
- `src/data/`: import and repository layer
- `supabase/`: schema and migrations
- `docs/`: architectural decisions and planning notes

## First Milestone

The first milestone is not a polished dashboard. It is a trustworthy foundation:

1. Establish the schema in Supabase/Postgres.
2. Import historical ATP data from Jeff Sackmann.
3. Rebuild overall and surface-specific Elo.
4. Produce explainable baseline predictions.

## Local Setup

1. Install dependencies with `npm install`.
2. Create `.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

3. Run the app with `npm run dev`.

For server-side data loads, also set:

```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Do not expose that key to the browser.

For the live ATP schedule sync via RapidAPI, also set:

```bash
RAPIDAPI_TENNIS_KEY=your_rapidapi_key
RAPIDAPI_TENNIS_HOST=tennis-api-atp-wta-itf.p.rapidapi.com
```

`RAPIDAPI_TENNIS_HOST` can stay at that default unless the provider changes its host.

## Current Status

This scaffold includes:

- an ATP-first product shell in Next.js
- domain contracts for matches, players, and predictions
- a transparent baseline model contract
- an initial Supabase schema designed for prediction storage and evaluation

The next implementation plan is documented in:

- `docs/phase-2-roadmap.md`

## Jeff Sackmann Data

The Jeff Sackmann ATP dataset is now loaded locally from the Hugging Face archival mirror.

Current local source set in `data/jeff-sackmann/atp/`:

- `atp_matches_1968.csv` through `atp_matches_2026.csv`
- `atp_players.csv`
- `atp_rankings_70s.csv` through `atp_rankings_20s.csv`
- `atp_rankings_current.csv`
- `matches_data_dictionary.txt`
- `UPSTREAM_README.md`

The importer path is designed around these local source files:

1. Validate the files with `npm run inspect:sackmann`.
2. Normalize and import the data with a server-side workflow, not the public anon key.
3. Backfill ratings and derived features after the raw ATP history is staged.
