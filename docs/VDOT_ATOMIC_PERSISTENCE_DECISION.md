# AUDIT-134 task 2.8: RaceResult atomic persistence decision

## Recommendation
**Keep the existing Base44 app as system of record for existing athlete data, but isolate new race-result writes behind a provider-neutral atomic persistence interface.** Do not implement a Base44 CRUD adapter until Base44 documents and proves composite uniqueness, durable request idempotency and conditional atomic updates. For an external candidate, evaluate **Cloudflare Workers + D1** with a separate staging D1 database and Worker; its SQLite semantics support unique constraints and conditional UPDATE, subject to implementation and acceptance testing. This is a candidate, not a deployed or approved service.

## Comparison
| Option | Advantages | Gaps and risks | Decision |
|---|---|---|---|
| Base44 entities alone | No extra service or bill; existing authentication and SDK | No documented native composite unique constraint, transactional idempotency or CAS established in available API evidence; creator/RLS and isolation unverified | Hold |
| Cloudflare Worker + D1 | SQL UNIQUE constraint, conditional UPDATE with revision predicate, separate staging database, usage-based costs | New account/config/secrets, auth verification bridge, two data systems, migration, audit and operational ownership | Preferred candidate if Base44 cannot prove native atomicity |
| Hosted PostgreSQL | Transactions, UNIQUE, row-level security, mature ecosystem | Additional credentials, provisioning, operational complexity and costs | Alternative if already in approved stack |

## Provider-neutral implementation
`base44/shared/racePersistencePort.ts` defines `createRacePersistenceService(port)`. Required adapter methods:
- `insertUniqueIdempotent`: atomically enforce unique owner+race identity and owner+request key; replay same request payload, reject reused key with changed payload.
- `correctIfRevision`: atomically check owner and revision, enforce identity uniqueness, increment revision and record an audit entry.
`src/science/__tests__/racePersistencePort.test.ts` contains mock-serialized concurrency and security cases. The mock commits synchronously before resolving Promises. **This demonstrates the interface contract only, not real database safety.** No adapter has been wired to the Base44 function. The previous `RACE_RESULT_MUTATIONS_ENABLED=false` guard remains unchanged.

## Proposed D1 schema and transactional behavior (design only)
- `race_results(id, owner_id, race_identity, race_date, sport, distance_m, elapsed_seconds, revision, created_at, updated_at)`, `UNIQUE(owner_id,race_identity)`.
- `race_requests(owner_id,request_key,request_fingerprint,response_id)`, `UNIQUE(owner_id,request_key)`.
- `race_audit(id,owner_id,race_id,old_revision,new_revision,action,created_at)`.
- All related insert + request reservation + audit writes in one D1 transaction/batch; retries use durable stored fingerprint. Correction uses a single `UPDATE ... WHERE id=? AND owner_id=? AND revision=?` with affected-row check and transactionally stored audit; changing race identity must preserve uniqueness. Never treat a cross-network sequence of queries as atomic.
- Verify D1 batch rollback behavior and Worker auth with isolated staging before implementation. Do not store athlete secrets in client or repository.

## Costs and operations
Cloudflare D1 published pricing (Oct 30 2026): Free includes 5M rows read/day, 100k rows written/day, 5GB storage total and 10 databases. Paid includes 25B reads/month, 50M writes/month, 5GB storage and 100k databases, with overages. **Worker requests and any paid plan are additional and require separate review.** Usage-based charges, region/latency, retention, privacy and cross-provider support need validation; no costs incurred by this PR.
External service increases failure modes and adds data export/deletion, monitoring, backups, incident response and Australian privacy assessment responsibilities. Keep a clear data owner and sync policy.

## Isolation and release
Read-only Base44 metadata identifies distinct staging and production app IDs but does not prove database, auth, function or secret isolation. Both are in the same workspace. No staging records, schema deploys, secret reads or writes. No new Cloudflare resources, credentials, or deployment.

## Test gate
- Run targeted and full Vitest, lint, typecheck, build, and exact-SHA CI; the authored mock tests are not a substitute for a running DB.
- Prove staging isolation and authenticated user A/B ownership boundaries.
- Implement real adapter and verify concurrent insert, idempotent replay, correction CAS, transaction rollback, audit integrity, retry after uncertain response, and cross-owner isolation.
- Do not merge PRs #151, #153, #154, #155, #156, #157 or this draft until all acceptance gates pass.

**Release: HOLD. Race-result writes remain disabled.**
