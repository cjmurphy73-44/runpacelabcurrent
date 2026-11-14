# AUDIT-134 task 2.7: isolated staging and atomic RaceResult design

## Reconciled draft stack
#151 -> #153 -> #154 -> #155 -> #156 -> this draft. All remain unmerged; race-result writes remain disabled by `RACE_RESULT_MUTATIONS_ENABLED=false`.

## Read-only isolation evidence
- Staging Base44 app ID `6aefe9d09e2788fc8591c758`, name TrainPaceLab-Staging.
- Production Base44 app ID `6a504ebe6a5a6d1be058226c`, name TrainPaceLab.
- Both Get app metadata responses report the same workspace organization ID `6a33b22b97298e2e73e09e46`.
- Both Base44 agent-profile responses report `vite_spa`, `backend_runtime=current`, `custom_auth_enrolled=true` and `core_integrations=client_allowed`.
- The platform agent profile exposes Base44's own reference locations for entity RLS, backend functions and SDK, but does not attest per-app data tenancy, user identities, secret separation, provider token isolation or function endpoints.
- Previously inspected staging/production entity schema showed no deployed RaceResult. This task did not install schemas or call any write APIs.
- The Base44 app API is beta, and Get app payload can be truncated; undocumented response fields are not evidence of isolation.

**Isolation conclusion:** separate app IDs proven; database, auth, secrets, functions and integrations **not independently proven isolated**. No synthetic writes permitted.

## Transaction/uniqueness investigation
The inspected Base44 platform API catalog includes entity CRUD, entity schema operations, backend functions, app OpenAPI reference and app metadata. It does **not establish** documented transaction, composite unique-index, compare-and-swap or conditional-update guarantees for app entity records. This is an evidence gap, not a categorical assertion that the platform lacks them.

A deterministic identity key alone is not an atomic uniqueness constraint. A read-before-create duplicate check is subject to concurrent races. Likewise, revision read-compare-update is not atomic.

## Candidate safe architecture (not implemented)
Use a transactional datastore/service with:
1. Durable `race_results` table with creator/athlete ownership established from verified authentication, not request fields.
2. Unique constraint on canonical (athlete_id, race_date, sport, distance_m, elapsed_seconds) or a stable source-event identity. Document how corrected times change identity.
3. Request idempotency key with unique (athlete_id, request_key), stored response hash and replay behavior. An idempotency key is distinct from race identity; it must be durable and checked in the same transaction as insertion.
4. Correction UPDATE with `WHERE id=? AND athlete_id=? AND revision=?`, returning conflict when zero rows updated, plus revision increment in the same transaction.
5. Append-only correction audit log in the same transaction; all sensitive writes scoped to authenticated owner.
6. Verified staging-only credentials and backend routing, fail-closed when config absent or mismatched.
7. Explicit errors, no fallback to non-atomic Base44 entity writes.

**Alternative:** If Base44 documents and demonstrates equivalent native atomic primitives, implement those instead of adding a second datastore. Do not provision external infrastructure or introduce new secrets until approved.

## Deterministic source changes
`base44/shared/raceAtomicContract.ts` defines stable length-prefixed identity, revision preconditions and an explicit capability-evidence design check. `src/science/__tests__/raceAtomicContract.test.ts` adds seven authored unit cases. This is **not** an implementation of database locking, uniqueness or CAS, and is not wired to enable writes.

## Acceptance and release blockers
- Vendor documentation or isolated proof of per-app database, auth, function and secret isolation.
- Confirm Base44 creator RLS and service-role owner stamping semantics.
- Choose and implement a truly atomic backend for unique inserts, idempotency and conditional revision updates, with transactional audit.
- Authenticated two-athlete staging tests, concurrent duplicate/correction tests, retries, foreign-ownership attacks, audit integrity and cleanup.
- Run Vitest, typecheck, lint, build and exact-head CI. No local checkout available for executing full project tests in this connector session.
- Keep all PRs draft, all mutations disabled, and production untouched.

**Decision: HOLD.**
