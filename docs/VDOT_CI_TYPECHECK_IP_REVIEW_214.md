# AUDIT-134 task 2.14: exact-head CI and IP gate

## Confirmed workflow execution
PR #176 SHA `6e7efead9eddbac44ee15b444931538ff377facb` had GitHub Actions run **43643489503** (PR merge checkout `123c4a782b870cbd96a55f7b9749ce87347b2178`).
- SQLite job: **13/13 tests passed**.
- Selected Vitest job: **22/22 tests passed** across four files.
- Typecheck: failed with exactly four errors: `TS5097` for `.ts` import suffixes in `base44/shared/racePersistencePort.ts` and `base44/shared/raceResultContract.ts` (3 total); `TS2339` undeclared `RacePersistenceError.code` (1).
- GitHub checkout cleanup warned `No url found for submodule path 'odysseus' in .gitmodules`. This was a warning in post-job cleanup, not the cause of test failure. **Do not remove or alter Odysseus without separate preservation review.**

## Fixes in this draft
- Remove unsupported `.ts` suffix from the three local imports, without changing the imported modules.
- Declare the existing error code field as `string`, preserving runtime behavior.
- Make the frontend science IP import gate an explicit CI step after typecheck. It is **expected to fail until an authorized IP review resolves the browser imports**; do not whitelist or weaken the protection merely to turn CI green.

## Verified Vercel root cause
Vercel deployment `dpl_8NYMuPzzy6MaTXGnh7EYkq5HbcnL` for #171 commit `0757f7169d338478294908a1ba53a675f141884b` ran `npm run build` and exited 1 because `scripts/check-client-science-imports.mjs` flagged `src/components/NorwegianIntervalPlanner.tsx` importing `@/science/norwegianEngine` and `src/lib/physiologyEngine.ts` importing `../science/vdot`. These are direct browser-side science imports; no IP review authorizing exposure is on record. The safe choice is to preserve the gate and leave build blocked pending review of module contents, bundling and alternative server-owned calculation. The separate #176 Vercel status points to the build-rate-limit page.

## Scope
No Worker, D1, Base44 function, app configuration, feature flag, production data, paid resources or deployment was changed. RaceResult writes remain disabled. The CI workflow does not require secrets or write to backend services.

## Release
HOLD until exact-head CI verifies typecheck, authorized IP review resolves imports, D1 runtime transaction behavior and Base44 staging isolation are independently verified.
