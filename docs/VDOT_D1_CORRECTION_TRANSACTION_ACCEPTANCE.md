# AUDIT-134 task 2.12: D1 correction transaction and evidence

## Draft stack
#151 -> #153 -> #154 -> #155 -> #156 -> #157 -> #161 -> #162 -> #171 -> #173 -> this draft. No merges, Worker deployments or Base44 function changes. The default-off RaceResult mutation guard remains in place.

## Implementation
`infra/race-d1/correctionAdapter.ts` implements the `correctAndRecordAtomically` interface from #173:
1. Reserve unique (owner_id, request_key) with original response snapshot.
2. Conditional `UPDATE race_results WHERE id=? AND owner_id=? AND revision=?`, increment revision; audit trigger records correction in same SQLite transaction.
3. `INSERT race_correction_assertions(...,changes())` with `CHECK(affected=1)` aborts entire transaction if zero rows updated.
4. Delete temporary assertion in the same batch.
5. On ambiguous failure, read durable request record; identical fingerprint replays immutable original response; different fingerprint rejects key reuse. Other failures map to missing record, stale revision, duplicate identity or transaction failure.

**Important assumption:** D1 `db.batch` must execute all statements in order on the same connection in one rollback-on-error transaction; `changes()` must reflect the immediately preceding UPDATE and exclude trigger writes. Verified in a local SQLite simulation, **not in Cloudflare D1**. The adapter is not wired to any HTTP route or Base44 function. A future deployment must confirm this D1 behavior and enforce a trusted Base44-to-Worker owner identity.

## Tests
Committed `infra/race-d1/test_correction_batch.py` includes five real SQLite tests: competing correction CAS, stale revision rollback, injected rollback, duplicate request key, foreign-owner zero-row assertion. They are authored in GitHub but not executed from an exact checked-out commit.

Local independent SQLite simulation on a temporary DB executed and observed:
- 2 competing revision-1 corrections -> one success, one IntegrityError
- stale revision -> IntegrityError
- injected precommit exception -> rollback
- persisted correction request count 1, audit count 1, final revision 2

This is **not** evidence of actual D1 adapter runtime, exact committed Python suite, TypeScript tests, lint, typecheck or build.

## CI
Exact PR #173 head `32d1854341fdc40c27a8852d13d49ff56dec1a32`: Vercel combined status failure with URL ending `upgradeToPro=build-rate-limit`; no GitHub Actions runs returned. Build-rate limit is not a compiler error. Check this PR's exact head again before release.

## Read-only Base44 isolation
Read-only entity schema query returned zero `RaceResult` schemas for both staging app `6aefe9d09e2788fc8591c758` and production app `6a504ebe6a5a6d1be058226c`. Separate app IDs do not prove separate databases, auth, functions, secrets or integrations; staging isolation is still unproven. No synthetic writes or schema deployments.

## Remaining gates
- Execute committed Python suites and TypeScript tests, lint, typecheck, build on exact SHA.
- Verify D1 batch atomic rollback and `changes()` on an independently isolated staging database after separate approval.
- Ensure correction fingerprint covers all versioned, validated fields; bound response snapshot sizes; add durable nonce cleanup and trusted Base44 owner authentication.
- Add tests for response loss after commit, correction replay after further corrections, concurrent same-key requests, audit immutability and D1 failure modes.
- Independently attest Base44 staging database, auth, secrets, function and integration boundaries.

**HOLD: RaceResult writes disabled. No paid resources, merge, deploy or production modifications.**
