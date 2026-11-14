# Audit #134, task 2.2: VDOT evidence and missing-data contract

## Confirmed defects
- `physiologyCompute` selected the highest VDOT from any recent running session, not a race-specific or maximal-effort record. Easy workouts can generate misleading performance estimates.
- `src/hooks/useNorwegianWorkouts.ts` silently seeded VDOT 55; `src/lib/physiologyEngine.ts` returned fixed pace strings for any VDOT.
- `src/pages/Vdot.jsx` initially supplied 22:30 for 5 km; the displayed result was only one click away from an unentered example.
- Core frontend and backend Daniels calculators checked positive/range limits but not finite numbers; NaN and Infinity can propagate.
- `physiologyCompute` used stored VDOT as fallback without provenance, and labeled that fallback inconsistently.

## Focused draft changes
- Pure backend `vdotEvidence.ts` gates automatic selection on explicitly marked race effort, running sport, valid date (not future, within 180 days), finite duration >= 180 seconds and distance >= 1200 m. Missing race markers fail closed.
- `physiologyCompute` only auto-estimates from qualifying marked races; stored finite positive VDOT remains visible with **unverified provenance** and is not represented as verified race evidence.
- The backend calculator validates numeric input, and the frontend/math calculators reject nonfinite input.
- VDOT calculator starts without an example race time and clears stale results when inputs change; Norwegian workout hook no longer silently seeds 55; fixed pace labels replaced with Daniels-derived paces.
- Nine regression tests authored for eligibility, invalid inputs, parity and placeholder elimination.

## Release blockers
1. `WorkoutSession.jsonc` has no confirmed `is_race` or `activity_type` schema property. Until a documented and authenticated race-result source and data contract exist, automatic selection intentionally returns **no verified race**. Do not silently infer maximal effort from training sessions.
2. No proof that a stored `vdot_estimate` came from a verified race. Retain the field for backward compatibility but label it as unverified. A provenance migration and UI review are required.
3. Check other VDOT consumers and workout planning for null handling, particularly hooks that previously assumed 55.
4. Existing standalone VDOT HTTP endpoint still needs authenticated access and safe request-error semantics reviewed independently.
5. Run Vitest, lint, typecheck, build and Base44 staging smoke tests; none have been executed in this change set.
6. Existing race equivalence projections remain theoretical; do not present as actual race results.

**Decision: HOLD**. No merge, staging deploy, production deploy or athlete data mutation.
