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
