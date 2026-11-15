# Audit #134, task 2.1: CTL / ATL / TSB contract

## Confirmed divergence in main
- `src/science/load.ts` and `src/math/load.ts` use daily alpha `1 - exp(-1 / tau)`, defaults 42 and 7 days, zero initial state.
- `base44/shared/ctlRecalc.ts` used `2 / (tau + 1)` and seeded CTL and ATL to the first day's full load. The same daily history therefore gave different numbers.
- `ctlRecalc.ts` and `calculateDailyTRIMP` used `session_trimp || session_tss || 0`: an explicit TRIMP zero was replaced by TSS, and missing load became an assumed zero.

## Changes in this draft
- Backend recomputation uses the pure `nextDailyEwma` with exponential tau and zero baseline. Every UTC calendar day advances the model, including zero-load days between workouts.
- Both backend writers use `dailyLoadValue`: first finite nonnegative TRIMP, otherwise finite nonnegative TSS. Explicit zero is retained. No valid load throws before the recompute's persistence phase; the daily writer fails before updating a row.
- New cross-runtime tests compare the backend helper to the frontend `calculateCTL`, `calculateATL`, and `calculateEWMA`, including rest days, custom time constants, zero vs missing, and invalid inputs.

## Important unresolved scientific and operational contracts
1. **Zero baseline is a modeling assumption, not measured fitness**. Incomplete historical coverage and confirmed rest days must be distinguished before interpreting current readiness. Do not silently backfill unknown days as verified rest days.
2. **Historical results will change** after deploying this formula correction. Requires a versioned migration/recompute plan, sample athlete before/after diff, user-facing provenance and staged acceptance.
3. **Daily stress units remain mixed**: TRIMP is preferred over TSS when available; this fallback is not unit equivalence. Separate stress model/unit provenance is a follow-up.
4. **Read completeness is not proven**: Base44 `WorkoutSession.filter({ athlete_id })` and `DailyMetrics.filter({ athlete_id })` are unpaginated. Recompute must not be deployed until complete historical reads and durable pagination are verified. The current change prevents missing *values* from becoming zero, not missing *records*.
5. **Concurrent recomputes are not atomic**: bulk daily writes and athlete profile snapshot may diverge on partial failure. No concurrency/transaction claim.
6. `training_tier_preference` maps conservative to tau 10/12 and aggressive to 28/5; keep existing tier settings in this focused PR, but review rationale separately.
7. No-workout path still clears existing calculated values to zero; needs coverage-aware policy before production. Workout dates in the future and invalid dates need validation.

## Release decision
**HOLD.** No production deploy, migration, merge, or historical data rewrite. Authored Vitest tests must execute, full CI must pass, and staging must verify backend function import compatibility and representative multi-year athlete histories.
