# TrainPaceLab architecture consolidation plan
Status: audited baseline; migration work not yet completed.

## Evidence from production repository
- 447 files under `src/`; 228 under `src/components/`; 35 pages.
- At least four mathematical locations: `src/science/`, `src/math/`, `src/lib/algorithms/`, `src/utils/physiology/`.
- `base44/functions/` has dozens of independently deployed entrypoints. Treat server-side and client-side execution as separate trust zones.
- Large UI files include `Landing.jsx`, `AthleteSettings.jsx`, `Home.jsx`, `ActivityDetail.jsx`, and `TrainingKanban.jsx`.
- Multiple roadmap files exist (`src/PRODUCTION_ROADMAP.md`, `src/BETA_READINESS_ROADMAP.md`, plus documentation elsewhere). No file is to be deleted or renamed until references are reconciled.
- Initial lint baseline: 3 unused imports. Removed in this increment.

## Target boundaries (incremental; no bulk move)
1. **science/reference**: cited, published models and reproducible golden-case tests; document units, validity domains and provenance.
2. **server/proprietary**: confidential original algorithms behind authenticated, athlete-scoped Base44 functions. No browser implementation or secret coefficients in client bundles or documentation.
3. **integrations**: Garmin, COROS, Strava and file-ingest adapters; one normalized stream contract, idempotency and explicit partial failure.
4. **application services**: deterministic orchestration, query contracts and errors, separated from React rendering.
5. **features**: dashboard, coaching, workouts, training plan, physiology, onboarding and billing; colocate feature-specific UI and tests as migration proceeds.
6. **design system**: shared accessible components, branded tokens, owned logo assets and licensed real photography.
7. **operations**: single canonical roadmap index, release verification, CI gates, incident and deployment procedures.

## Atomic delivery sequence
- ARCH-001: fix existing lint errors; enforce lint/build/typecheck/tests on every patch. **Completed.**
- ARCH-002: create import/dependency graph, classify each mathematics module as published/proprietary/unknown, flag circular and duplicate exports. Report module paths only, never secret formulas.
- ARCH-003: identify the authoritative implementation for each duplicated model using golden-case parity; deprecate wrappers before any deletion.
- ARCH-004: move one verified proprietary model behind a scoped server endpoint with RLS, input validation, rate limiting and deterministic parity tests.
- ARCH-005: standardize wearable normalized-stream schemas and explicit failure provenance across providers.
- ARCH-006: split one oversized page into feature components without changing behavior, with mobile screenshot and accessibility acceptance.
- ARCH-007: consolidate roadmap navigation via an index of existing documents, preserving history and links.
- ARCH-008: design and test brand asset variants with verified ownership and licensing.
- ARCH-009: verify source-to-published-release mapping and production rollback before any public launch claim.

## Non-negotiable gates
- No real athlete data in tests; no Odysseus modification.
- Preserve current behavior until parity tests prove a replacement.
- Never publish secret model details in client JavaScript, public documentation or external AI prompts.
- A green build is not proof of end-to-end Garmin/COROS fidelity, auth security or live deployment.
