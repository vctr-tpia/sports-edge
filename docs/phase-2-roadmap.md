# Sports Edge Phase 2 Roadmap

As of Tuesday, July 21, 2026, Sports Edge has:

- a 10-year ATP historical dataset loaded into Supabase
- overall Elo and surface Elo backfilled
- a transparent baseline match model
- a first `baseline-v2` upgrade with surface-aware recent form
- live ATP schedule ingestion from RapidAPI
- live upcoming predictions and historical backtest examples in the app

Phase 2 should focus on model quality, evaluation, and automation before more surface-level UI work.

## Guiding Priority

1. Make the model measurable.
2. Make the model sharper.
3. Make the live pipeline reliable.
4. Make the product easier to trust.

## Milestone 1: Evaluation Pipeline

### Goal

Turn the current baseline model into something we can measure rigorously instead of judging by anecdotal picks.

### Deliverables

- `model_runs` usage for every historical backtest and live scoring job
- stored prediction rows for historical backtests, not just feature snapshots
- evaluation tables or views for:
  - accuracy
  - log loss
  - Brier score
  - calibration by probability bucket
  - performance by surface
  - performance by tournament level
  - performance by favorite vs underdog
- one repeatable backtest script for `baseline-v1`
- one report artifact written to `work/evaluation/`

### Why This Comes First

Without this, every model improvement is guesswork. We need a benchmark before adding more features.

### Done Means

- we can run one command and produce a repeatable evaluation report
- we can answer whether `baseline-v1` is good or bad by metric, not opinion
- we can compare future model versions against the same benchmark

### Current Result

The benchmark layer is now in place.

- `baseline-v1`: accuracy `0.6145`, log loss `0.6844`, Brier `0.2416`
- `baseline-v2`: accuracy `0.6193`, log loss `0.6714`, Brier `0.2378`

This means the first surface-aware feature upgrade improved all three primary metrics.

## Milestone 2: Feature Upgrade V2

### Goal

Improve the baseline model with stronger tennis-specific features while keeping it transparent.

### Missing Features From The Original Vision

- serving strength
- return strength
- hold percentage
- break percentage
- tiebreak performance
- opponent quality with better windows
- tournament-level behavior
- best-of-5 vs best-of-3 handling

### Deliverables

- feature-generation upgrade from `baseline-features-v1` to `baseline-features-v2`
- derived pre-match features such as:
  - last 5 overall win rate
  - last 5 on same surface
  - last 10 weighted form
  - hold percentage
  - break percentage
  - service dominance proxy
  - return dominance proxy
  - recent Elo trend
  - best-of format flag
  - tournament-level feature flags
- stronger head-to-head logic:
  - surface-aware
  - recency-aware
  - downweighted when sample is stale or tiny

### Model Changes

Keep the model transparent. That means:

- update factor weights deliberately
- keep factor-level explanations
- avoid ML in this milestone

### Done Means

- `baseline-v2` exists with clear factor definitions
- we can backtest `baseline-v2` against `baseline-v1`
- the new version beats or meaningfully improves calibration or loss metrics

## Milestone 3: Live Match Settlement

### Goal

Finish the live prediction lifecycle instead of stopping at scheduled-match scoring.

### Deliverables

- live re-sync job for scheduled ATP matches
- final-result ingestion
- settlement rules for:
  - completed matches
  - withdrawals
  - walkovers
  - cancelled/postponed matches
- promotion flow from `upcoming_matches` into historical truth:
  - `matches`
  - `match_entries`
  - `player_match_stats` when available
- prediction outcome settlement for live predictions

### Why This Matters

Right now we can score live matches, but we cannot yet complete the feedback loop cleanly.

### Done Means

- a scheduled live match can become a completed historical match automatically
- live predictions receive final outcomes
- evaluation can include live-generated predictions without manual cleanup

## Milestone 4: Daily Automation

### Goal

Remove manual operational steps from the ATP MVP.

### Deliverables

- scheduled sync cadence for live ATP matches
- one daily refresh job for:
  - live fixtures
  - prediction regeneration
  - settlement checks
- operational logs for each run
- failure visibility:
  - unresolved player mappings
  - provider failures
  - schema/load failures

### Recommended Cadence

- daily full sync for the next 7 days
- intraday sync for same-day and next-day matches
- settlement sweep for recently completed matches

### Done Means

- predictions update without manual intervention
- failed syncs are visible
- the ATP MVP can stay current day to day

## Milestone 5: Matchup Detail Product Layer

### Goal

Turn model output into a page a user can actually trust.

### Deliverables

- improved `/match/[matchId]` page
- clearer explanation layout:
  - favorite
  - win probability
  - confidence
  - top reasons
  - full factor table
- matchup comparison blocks:
  - surface record
  - recent form
  - Elo comparison
  - head-to-head
  - rest/fatigue context

### What This Should Answer

- Why is this player favored?
- Is the edge large or small?
- Which factors disagree with the final pick?

### Done Means

- the match page feels like an analytics product, not a debug screen
- a user can explain the pick back in plain English after reading it

## Milestone 6: Odds And Edge Layer

### Goal

Add market comparison for evaluation without turning the product into a betting app.

### Deliverables

- odds source selection
- market implied probability fields
- edge calculation
- stored edge history for each prediction
- performance reporting by edge bucket

### Why It Matters

This is the cleanest way to test whether the model is merely accurate or actually mispriced relative to the market.

### Done Means

- every stored live prediction can be compared against market probability
- we can measure whether positive-edge spots outperform

## Explicitly Out Of Scope For Phase 2

- WTA support
- soccer, MLB, NBA, WNBA, NFL
- machine-learning-first replacement of the baseline
- broad social features
- public user auth workflows
- payment or subscription work

## Recommended Execution Order

1. Evaluation pipeline
2. Feature upgrade `baseline-v2`
3. Live settlement
4. Daily automation
5. Match detail product layer
6. Odds and edge layer

## Immediate Next Sprint Recommendation

If we only do one sprint next, it should be:

1. Persist historical backtest predictions.
2. Build the evaluation report pipeline.
3. Add calibration and log-loss reporting.

That sprint gives us the benchmark we need before changing the model itself.

## Current Implementation Status

The first part of Milestone 1 is now implemented locally:

- `npm run compute:baseline-backtest`
- `npm run load:baseline-backtest`

Artifacts written to:

- `work/evaluation/baseline-v1/historical_predictions.jsonl`
- `work/evaluation/baseline-v1/summary.json`
- `work/evaluation/baseline-v1/calibration.json`
- `work/evaluation/baseline-v1/by_surface.json`
- `work/evaluation/baseline-v1/by_tournament_level.json`
