# Live Operations

## Scheduled Jobs

Sports Edge now includes two GitHub Actions workflows:

- `.github/workflows/atp-results-settlement.yml`
  - Runs every 4 hours.
  - Command: `npm run ingest:rapidapi-results`
  - Purpose: settles recent ATP matches that have finished and stores final status + score in `upcoming_matches`.

- `.github/workflows/atp-daily-refresh.yml`
  - Runs daily at `13:15 UTC`.
  - Command: `npm run daily:refresh`
  - Purpose:
    - settlement sweep for recent matches
    - live ATP sync for the next 7 days
    - prediction regeneration
    - Supabase load for upcoming rows

## Required GitHub Secrets

Add these repository secrets before enabling the workflows:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RAPIDAPI_TENNIS_KEY`
- `RAPIDAPI_TENNIS_HOST`

## Required Supabase Migrations

Apply these migrations before running the full automation flow:

- `supabase/migrations/20260721_010_upcoming_prediction_totals.sql`
- `supabase/migrations/20260721_011_upcoming_match_settlement.sql`

## Manual Commands

- Refresh live ATP fixtures and predictions:
  - `npm run sync:rapidapi-upcoming`
  - `npm run load:upcoming-matches`

- Dry-run result settlement:
  - `npm run ingest:rapidapi-results -- --dry-run`

- Full daily flow:
  - `npm run daily:refresh`
