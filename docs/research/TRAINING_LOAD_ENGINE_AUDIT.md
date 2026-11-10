# Training-load engine source audit — 9 November 2026

Status: source-only research and proposed contract. No algorithm or hosted app changed. Existing G0–G3 gates still block science implementation.

## Inspected source
- `src/math/load.ts`, `src/science/load.ts`: rTSS, HR-reserve hrTSS, CTL/ATL with alpha = 1 − exp(−1/τ), τ=42/7 days.
- `src/lib/metrics/loadEngine.ts`: EWMA alpha = 2/(N+1), first-sample initialization; `days` argument unused.
- `base44/functions/calculateTrainingLoad/entry.ts`: backend argument-presence dispatch.
- `PHYSIOLOGY_LOGIC.md`: 2/(N+1) convention, Banister TRIMP and VDOT zone descriptions.

Inspected on `fix/provider-connection-feedback`; exact hosted deployment identity and full caller inventory are unverified.

## Findings requiring reconciliation
1. **Incompatible EWMA conventions.** For N=42, alpha is approximately 0.02353 with exponential decay versus 0.04651 with span smoothing. For N=7, approximately 0.13312 versus 0.25. These yield materially different trajectories.
2. **Different initialization.** For a single day TSS=100, the first-sample-seeded implementation yields CTL=ATL=100 and TSB=0. Zero-seeded exponential decay yields CTL≈2.4, ATL≈13.3 and TSB≈−10.9. Neither should be represented as a fully established athlete's baseline without history.
3. **Backend dispatch bug.** `calculateTrainingLoad/entry.ts` defaults `previousCTL=0` and `ctlTauDays=42`. Whenever `dailyTSS` is supplied, the first CTL condition succeeds and returns, so the later ATL branch is unreachable for that input shape. A request supplying `dailyTSSHistory` and `dailyTSS` also takes the CTL branch.
4. **Invalid data can masquerade as zero.** Pace and HR functions return zero for some invalid values. HR threshold at/below resting HR can cause division by zero or invalid ratios. Duration and finite numeric inputs are not consistently validated.
5. **Mixed stress units.** HR-reserve-squared hrTSS, pace-ratio-squared rTSS and Banister TRIMP are different measures. Their numeric outputs must not be mixed into one EWMA without reviewed normalization and method provenance.

## Proposed deterministic coaching contract (not yet approved)
- Normalize activities into versioned daily stress records with source, method, units, timestamps, athlete-local training date, data completeness and formula version.
- Select one daily-load unit, smoothing convention, initialization policy and missing-day treatment. Include confirmed zero-load rest days, but distinguish unknown days from verified rest.
- Define whether displayed TSB is previous-day morning form or post-session same-day form. Do not present CTL/ATL/TSB as direct fitness, recovery or injury-risk measurements.
- Use explicit backend operation selection or return CTL/ATL/TSB together. Reject negative/non-finite inputs and incompatible units with structured errors; do not silently invent a baseline.
- Backend coaching rules should consume validated measurements, athlete constraints, uncertainty and versioned decision records. AI explains these decisions; it must not calculate missing metrics, invent physiology, or override safety rules.

## Validation plan and UX
After G0–G3 gates, implement separately reviewed science tasks: (1) one canonical EWMA/initialization contract with parity fixtures across backend and frontend; (2) backend dispatch repair. Test impulse, rest days, missing-day gaps, multiple same-day sessions, short histories, timezone/DST transitions, non-finite inputs, invalid HR threshold and mixed methods. Capture units, rounding, timestamps and provenance.

Display method, data coverage and last-updated information beside each load metric. Prefer “modeled training load” and “insufficient data” over unsupported recovery certainty. Keep asset/logo improvements in the existing UX queue rather than implying visual polish validates algorithms.

**Research limitation:** This is a code audit, not an independent systematic literature review. Verify original physiology publications, coefficient applicability, licensing and athlete-specific calibration before production adoption. Fixed 42/7 EWMAs are workload proxies; they do not measure recovery directly.

Next atomic action: inventory actual consumers of the competing functions and identify the currently authoritative dashboard path, without altering science or deploying code.

## Consumer trace — 9 November 2026 (follow-up atomic source audit)

Source inspected: existing `fix/provider-connection-feedback` branch. The
following are direct import/call relationships, not proof of production execution.

| UI / workflow | Actual source dependency | Consequence |
| --- | --- | --- |
| `DashboardMetricBanner.jsx` | `calculateHistoricalAndProjectedLoad(workouts, [], 0)` in `src/lib/loadForecasting.js` | Shows historical CTL/ATL/TSB from a first-day-seeded 42/7 exponential EWMA. No stored backend load values used for these three cards. |
| `LoadFatigueChart.jsx` | Same `calculateHistoricalAndProjectedLoad(completedSessions, plannedWorkouts, 7)` | Historical/projected load shares the banner's model, but uses separately supplied sessions and forecast assumptions. |
| `LoadStatusCards.jsx` | `calculateTrainingLoads(workouts, timeRange)` in `src/lib/physiologyEngine.ts` | **Broken shape:** callee expects four arguments (history, maxHR, restHR, gender) and returns an **array** of daily TRIMP objects, not `{ctl,atl,tsb}`. Component's shape check causes it to return null. Do not infer that the cards are visible or valid. |
| `src/lib/metrics/updateMetrics.ts` | `calculateMetrics(tssValues)` in `src/lib/metrics/loadEngine.ts` | Alternate first-observation-seeded span EWMA; uses workout rows without an explicit chronological sort or zero-load rest-day fill. Contains a documented placeholder Prisma upsert key. This is an auxiliary path, not evidence of active Base44 dashboard use. |
| `base44/functions/calculateTrainingLoad/entry.ts` | Self-contained backend arithmetic | Has ambiguous dispatch described above; no direct frontend caller was established in this targeted search. |

### Additional observed defects / semantics to resolve

- `loadForecasting.js` chooses `session_trimp || session_tss || 0`. A real
  zero TRIMP value falls through to TSS; TRIMP and TSS may have incompatible
  units. Its projected-load rule uses fixed duration multipliers (0.4/0.7/1.0/1.3)
  without athlete calibration, yet `getTsbZoneInfo` calls TSB below −25
  “High Risk” and above +15 “Fresh,” with prescriptive advice. Those thresholds
  must not be treated as validated individual injury/readiness predictions.
- `DashboardMetricBanner.jsx` computes weekly TSS using the same TRIMP-or-TSS
  fallback and a seven-day timestamp cutoff, whereas the forecast groups by
  UTC date. Differences in date window and session inputs can cause mismatches.
- `physiologyEngine.ts` has fixed VDOT pace-zone **strings** independent of
  `vdotScore`; these are placeholders, not computed athlete-specific zones.
  `LoadStatusCards.jsx` calls its load routine with `timeRange` as a heart-rate
  parameter. Repair needs a separate typed interface and consumer tests.

### Updated engineering priority

The dashboard's actual visible candidate is **`src/lib/loadForecasting.js`**,
not the standalone `src/math/load.ts` / `src/science/load.ts` functions.
Before choosing a canonical science implementation, add fixture parity checks
for the banner/chart's shared function and trace its workout sources. Then
review projected stress multipliers and TSB risk language. Keep this work as
source audit only until the existing G0–G3 acceptance gates clear.

Evidence limitation: targeted repository search may omit dynamic imports or
unindexed files; a full dependency graph and hosted UI observation remain open.
