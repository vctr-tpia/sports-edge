# Sports Edge Architecture

## Guiding Decisions

1. ATP only for the MVP.
2. Database first, UI second.
3. Explainability is part of the domain model, not a presentation concern.
4. The first model is a transparent baseline, not machine learning.
5. Every prediction must be stored so future evaluation is possible.

## System Boundaries

### `app/`

Next.js route layer and presentation. This is where dashboards, matchup pages, and admin workflows live. It should compose data and render explanations, but it should not own prediction math.

### `src/domain/`

Sport-specific core types for players, matches, and predictions. This is the seam that lets ATP exist now while other sports can become separate modules later.

### `src/prediction/`

Explainable prediction engines. The first engine is `baseline-v1`, which combines weighted features into a win probability and emits factor-level explanations.

### `src/data/`

Importers and repository abstractions for historical datasets, live data, and derived features. This is where Jeff Sackmann ingestion will sit.

### `supabase/`

Database schema and migrations. PostgreSQL becomes the source of truth for players, matches, ratings, predictions, and evaluation history.

## Why This Schema

The schema intentionally separates:

- raw match history
- per-player match stats
- derived ratings history
- stored model predictions
- factor-level explanations for each prediction

This makes it possible to recalculate features, compare model versions, and audit why a prediction was made on a specific date.

One important design choice: `predictions` is not limited to one row per match. We allow one stored prediction per `match_id + model_version`, so the baseline model can remain the benchmark when later models are introduced.

## Why We Are Not Starting With ML

Machine learning before a trustworthy baseline would hide problems in data quality, feature leakage, and evaluation design. A transparent model gives us:

- a benchmark for future models
- explainable outputs for users
- easier debugging when predictions look wrong
- faster iteration on feature quality

## Recommended Build Order

1. Finish local app and Supabase setup.
2. Import Jeff Sackmann ATP historical data into staging tables.
3. Normalize players, tournaments, and matches into the production schema.
4. Backfill overall and surface-specific Elo ratings through match history.
5. Generate baseline match features and store `baseline-v1` predictions.
6. Build the first matchup page that answers why the favorite is favored.
