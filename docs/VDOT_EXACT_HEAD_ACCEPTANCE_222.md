# VDOT task 2.22: exact-head acceptance and fail-closed groundwork

## Verified #225 evidence
Original draft #225 head `430be4d445ce46997fb604dd151ec5b252a17090`. GitHub Actions #43760205282: SQLite **PASS**, 7 Vitest files **41/41 PASS**, TypeScript **PASS**, frontend IP review gate **FAIL** for `components/NorwegianIntervalPlanner.tsx` and `lib/physiologyEngine.ts`. This is the established prohibited browser import path, not a test/typecheck regression.

Vercel Git-connected deployment `dpl_CNZB9S9vuXfxd2NMgkNbgbYKK7s2` reports `ERROR` on the exact same Git SHA and branch; build events show `npm run build` calling `scripts/check-client-science-imports.mjs` and exiting 1 for those same two imports. This deployment has no successful preview and was **not** triggered by this task. Do not bypass the gate.

## New synthetic tests
Two independently testable Vitest cases in `raceVdotPresentationBoundary.test.ts` assert:
1. With feature disabled, even throwing auth, owner-resolution and science dependencies are never invoked and HTTP-like response is generic 503 for valid and malformed synthetic input.
2. Owner matching rejects coerced/mismatched user IDs, empty/nonstring athlete IDs and nonboolean proof flags.

The backend remains an undeployed disabled interface, so these tests **do not** establish authentication or data isolation in live Base44. The injected ownership resolver must query a persisted relationship using a trusted authenticated session; accepting a caller-manufactured `verifiedByServer` property would be unsafe. Existing frontend IP gate, protected formulas and RaceResult feature flags are unchanged.

## Read-only staging comparison
Staging app `6aefe9d09e2788fc8591c758`: status ready, version `39d9eb94021835c9caa5c2c3dc35ca23dccdf575`; RaceResult schema absent (0).
Production app `6a504ebe6a5a6d1be058226c`: status ready, version `3f386d4d52042940cb1767e6950ec78e33b3c81e`; RaceResult schema absent (0).
Different app IDs/versions and schema absence do not demonstrate independent auth tenants, databases, secrets, runtime function deployments or routing. Previous backend-function list API responses were truncated. No live functions, writes, secrets or deployment settings accessed.

## Acceptance and release decision
Exact-head new draft CI remains to be verified. Full production build blocked by legitimate IP review gate. Keep all releases **HOLD**, server presentation disabled, race-result mutations disabled, Odysseus untouched. No merge, deployments, paid resources, credentials, production or athlete data changes.
