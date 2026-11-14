# VDOT task 2.15: browser science IP boundary review

## Exact-head evidence
PR #178 SHA `b53926e7bf198e4e3ebe2a0c5ec06e6b27562225`, GitHub Actions run **43644109781**:
- SQLite job success (the 13 committed SQLite tests).
- Selected Vitest success (22 tests).
- Typecheck success: previous TS5097/TS2339 fixes validated.
- `node scripts/check-client-science-imports.mjs` failure, deliberately blocking unreviewed direct imports.
- Vercel combined status failure links to `upgradeToPro=build-rate-limit`. This is distinct from verified earlier #171 build logs.

## Import review
1. `src/components/NorwegianIntervalPlanner.tsx` imports `@/science/norwegianEngine`, and calls `calculateNorwegianPrescription` in `useMemo`. That module imports `./vdot`, so browser bundling exposes prescription and VDOT math transitively. Its use of `type IntervalFormat` is type-only, but the value import is real.
2. `src/lib/physiologyEngine.ts` imports `getTrainingPaces` from `../science/vdot` and exports a synchronous `getVdotPaceZones` wrapper. This also pulls VDOT implementation into a browser-facing module.

**Decision:** Do not add either file to the baseline allowlist. Do not disguise the imports with dynamic imports, aliases, copies, reexports or local duplicate formulas. The existing build gate is intentionally blocking a possible IP exposure.

**Safe architecture:** A future server-owned authenticated endpoint should compute the deterministic prescription and pace zones from validated inputs; frontend receives bounded display data and provenance. This needs separate backend isolation, authentication, authorization, caching/error/empty states and test approval. No such endpoint or browser behavior change is implemented in this PR. Current build remains blocked intentionally.

## Change
Added `raceFrontendIpGate.test.ts` with three regression checks: build invokes the IP gate, neither unreviewed file is in the allowlist, and flagged imports remain explicit until a reviewed migration. The PR test workflow includes these checks. This preserves existing behavior and guards against a silent allowlist bypass.

## Release
No changes to protected science modules, VDOT formulas, Base44 functions, production, Odysseus, credentials, D1 or deployment. Race-result writes remain disabled. Full build cannot pass while unreviewed imports remain. Need explicit architecture approval and staging isolation before implementing the server-owned alternative.
