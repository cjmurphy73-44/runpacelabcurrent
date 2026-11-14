# VDOT task 2.13: exact test and build evidence gate

## Reconciliation
This draft stacks on #174 -> #173 -> #171 -> #162 -> #161 -> #157 -> #156 -> #155 -> #154 -> #153 -> #151. The default-off Base44 RaceResult mutation guard is unchanged. No merges, deployments, credentials or athlete data writes.

## Confirmed Vercel failure
Read-only Vercel deployment `dpl_8NYMuPzzy6MaTXGnh7EYkq5HbcnL` at exact commit `0757f7169d338478294908a1ba53a675f141884b` (#171) reported `BUILD_UTILS_SPAWN_1` from `npm run build`. Build logs identify the cause: `scripts/check-client-science-imports.mjs` denied two new direct browser science imports: `src/components/NorwegianIntervalPlanner.tsx` importing `@/science/norwegianEngine`, and `src/lib/physiologyEngine.ts` importing `../science/vdot`. The IP-review gate is working as designed. **Do not whitelist these files without explicit review of browser bundle/IP exposure; no bypass in this PR.** Separate later #174 exact-head Vercel combined status points to the build-rate-limit page, not this detailed log.

## Exact committed tests
Added PR-scoped `.github/workflows/vdot-d1-acceptance.yml` to execute the checked-out committed Python SQLite suites and selected Vitest authentication, nonce, correction and persistence tests, plus typecheck. The workflow does not deploy or access secrets. A workflow file is not evidence that jobs ran: inspect exact SHA checks and logs before claiming success.
Added SQLite regression tests for replay snapshot persistence across later correction and audit immutability.

## Read-only Base44 evidence
Staging app `6aefe9d09e2788fc8591c758`: status ready, version `4fd880a0ff7c588e0530cf10d1dee75120f4b642`, RaceResult schema list empty. Production app `6a504ebe6a5a6d1be058226c`: status ready, version `3f386d4d52042940cb1767e6950ec78e33b3c81e`, RaceResult schema list empty. Distinct app IDs and versions do not establish database, auth, functions, secrets or integration isolation.

## Remaining release blockers
- Actual exact-commit workflow results; if GitHub Actions is disabled or workflows from draft branches are not triggered, use an authorized isolated checkout/runner.
- Review browser-side science imports and determine a safe architecture without weakening the IP gate.
- Validate D1 batch `changes()` and rollback against an independently isolated D1 runtime, not merely SQLite.
- Complete trusted Base44-to-Worker owner attestation, nonce replay retention, bounded idempotency payloads and correction response recovery.
- Obtain authoritative Base44 staging boundary evidence before any synthetic write.

**HOLD. Race-result writes remain disabled. No merge, deploy, paid resources or production changes.**
