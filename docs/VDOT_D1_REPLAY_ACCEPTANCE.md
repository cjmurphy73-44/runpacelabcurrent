# AUDIT-134 task 2.11: replay safety and isolated acceptance

## Reconciliation
Draft stack: #151 -> #153 -> #154 -> #155 -> #156 -> #157 -> #161 -> #162 -> #171 -> this PR. No merges. Base44 submitRaceResult still fails closed with `RACE_RESULT_MUTATIONS_ENABLED=false`.

## CI
Exact head of #171 (`0757f7169d338478294908a1ba53a675f141884b`): GitHub combined status reports Vercel failure at its exact deployment URL; GitHub Actions workflow runs query returned empty. Failure cause has **not** been proven from build logs. Do not claim test execution or successful CI.

## Changes
- `schema.sql`: adds unique issuer/environment/nonce storage for Worker token replay rejection; durable owner+request-key correction replay table with immutable rows.
- `nonceStore.ts`: atomic D1 INSERT for token nonce; duplicate, storage and uncertain-commit failures reject. Worker route is not deployed or connected.
- `correctionReplay.ts`: fail-closed interface requiring a provider method that atomically combines correction CAS, idempotency response and audit. **No actual D1 implementation of this combined operation yet.**
- New authored Vitest tests for nonce replay/concurrency/environment separation and correction port contract.

## Read-only staging evidence
Previously observed distinct Base44 app IDs and same workspace; both current runtime and custom auth. No independently verified data, authentication, secret, function or provider isolation. RaceResult entity absent in both apps on prior schema check. No synthetic writes, secrets or schema deployments.

## Executable isolated acceptance procedure (not run)
1. Checkout exact branch SHA and run `python3 -m unittest discover -s infra/race-d1 -p 'test_*.py' -v`.
2. Run `npm test -- --run src/science/__tests__/raceNonceStore.test.ts src/science/__tests__/raceCorrectionReplay.test.ts src/science/__tests__/raceWorkerAuth.test.ts`; then full `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
3. Independently verify staging Base44 database, auth, function, secret and integration boundaries. **Stop** if any cannot be verified.
4. After separate explicit approval, create an isolated staging-only D1 database/Worker with separate credentials, no production connections and a disabled write route.
5. Test real D1 schema migrations, atomic batch rollback, concurrent create/correction, immutable audit, retry-after-correction response snapshot, duplicate nonce handling and lost-response recovery.
6. Exercise authenticated synthetic athlete A/B cross-owner rejection and verify before/after counts, provenance, cleanup and no production effect.
7. Capture exact-head CI and deployment logs. Do not treat a Vercel failure as code failure without logs.

## Blockers
- GitHub/runner access for exact committed Python/Vitest execution and Vercel build logs.
- Native Base44 isolation and RLS/service-role ownership evidence.
- A true transactional D1 correction replay adapter, including durable response snapshot in the same transaction as CAS and audit.
- A trusted Base44 identity attestation route and verified Worker enforcement, nonce cleanup, key rotation and rate limiting.
- Isolated staging D1 acceptance and privacy/cost approval.

**Release HOLD: writes disabled, no merge, deployment, paid resources or production modification.**
