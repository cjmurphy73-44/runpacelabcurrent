# AUDIT-134 task 2.9: D1 transactional RaceResult adapter acceptance

## Scope and source stack
Draft PR #161 builds on #157 -> #156 -> #155 -> #154 -> #153 -> #151. This draft stacks on #161. All remain unmerged. No live database, paid Cloudflare resource, Base44 schema or function has been created or deployed.

## New implementation
- `infra/race-d1/schema.sql`: SQLite/D1 tables for race results, request idempotency and append-only audit; owner-scoped unique race identity and unique request key. Triggers record creation and correction in the same SQLite transaction, reject unsafe revision/owner changes and deny deletes.
- `infra/race-d1/adapter.ts`: implements the existing provider-neutral port with D1 `batch` for request reservation + race insertion + request linkage; duplicate-key handling reads durable fingerprint for replay; correction uses one conditional `UPDATE ... WHERE owner_id=? AND revision=? RETURNING *`. Audit trigger is part of that statement's transaction.
- `infra/race-d1/test_sqlite_transactions.py`: Python stdlib SQLite tests for 16 competing insertions, durable request key uniqueness, separate owners, transaction rollback, two competing corrections and failed duplicate correction/audit integrity.

## Local test evidence
A representative SQLite schema and concurrent transaction harness was executed in a local temporary database on 2026-11-14:
- 16 competing inserts -> exactly one committed; one race, one request and one audit row.
- Two competing conditional revision updates -> exactly one committed.
- Audit sequence -> created, corrected.
This local harness was reconstructed from the same schema semantics, **not an execution of the checked-in GitHub test file**. The committed Python test suite and TypeScript D1 adapter have not yet been executed in a complete checkout; Cloudflare D1 batch semantics and Worker integration are untested.

## Critical open design issues
1. **Authentication boundary**: The adapter takes `ownerId` from its caller. A Cloudflare Worker MUST verify a short-lived, audience-scoped identity token issued by a trusted Base44 backend and bind its subject to the owner, never trust client JSON. Verify issuer, audience, expiry, replay protections, key rotation and per-environment secrets. Do not expose D1 bindings or Worker credentials in browser code.
2. **Staging isolation**: Base44 staging and production have distinct app IDs but share a workspace. Database, auth, function, secret and provider-token isolation is not independently proven. Cloudflare staging must use separate Worker, D1 database, service credentials and bindings.
3. **Idempotency payload**: The current adapter fingerprints canonical identity and known race fields, but does not yet include every possible metadata field or correction idempotency. Define stable versioned serialization and request/response retention before activation.
4. **D1 API acceptance**: Verify `db.batch` atomic rollback, returned success fields, `UPDATE RETURNING` support, trigger behavior, timeout/uncertain response retries and concurrent Worker instances against actual isolated D1.
5. **Audit integrity**: Audit table is append-only by convention but lacks SQL triggers denying direct UPDATE/DELETE of audit rows. A privileged backend could mutate it; add explicit protections and retention policy before release.
6. **Corrections**: Updating a race identity does not currently rewrite historical request fingerprints. Define replay and correction semantics before production.
7. **Privacy and operations**: Data processing location, retention, deletion/export, backups, disaster recovery, monitoring, cost alerts and cross-provider transfer require approval.
8. **Testing**: Run committed Python suite, TypeScript unit tests, lint, typecheck, build, GitHub CI and real isolated D1 acceptance. Local harness alone is insufficient.

## Deployment boundary
No `wrangler.toml`, Worker route, API endpoint, Cloudflare account connection, D1 binding, secret, Base44 SDK invocation or production write switch is added. `RACE_RESULT_MUTATIONS_ENABLED=false` from PR #156 remains unchanged. This adapter is not reachable by an athlete or production request.

## Next safe milestone
Run the committed tests on an exact branch checkout; correct any SQLite/D1 compatibility problems. Harden audit immutability, idempotency and correction semantics. Prepare isolated Worker authentication contract without provisioning resources, then obtain explicit approval for isolated D1 staging deployment and synthetic tests.

**Release: HOLD. No merge or production modification.**
