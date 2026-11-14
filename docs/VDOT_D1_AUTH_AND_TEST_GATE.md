# AUDIT-134 VDOT task 2.10: exact-suite execution and Worker authentication gate

## Reconciliation
Stacked drafts #151 -> #153 -> #154 -> #155 -> #156 -> #157 -> #161 -> #162 -> this draft. RaceResult mutations remain explicitly disabled in the Base44 function by the default-off capability gate. No merge, deployment, schema application or production modification.

## Confirmed design correction
PR #162's idempotency replay read the **current** race row. If a race had since been corrected, retrying the original create request could return corrected race values rather than the original create response. The D1 schema now stores `response_json` in `race_requests` and the adapter writes the response snapshot in the same D1 batch as request reservation and insertion. Retries return the original snapshot and verify its owner, race identity and ID. This is still unverified against the actual D1 runtime.

## Authentication contract
`infra/race-d1/workerAuth.ts` implements an *unwired* HMAC-SHA256 envelope for Base44 server-to-Worker calls:
- Server-only shared secret, minimum 32 characters, separate staging and production values.
- Signed issuer, audience, environment, owner ID, issued/expiry times (60 seconds), and nonce.
- Worker verifies signature, issuer, audience, environment, expiry and short clock skew before deriving owner ID.
- Tests cover valid staging token, wrong audience/environment/issuer/secret, expiry, future issuance, tampering and weak keys.
- **Critical**: A Base44 backend must first authenticate the user and verify creator ownership of AthleteProfile. The Worker must enforce durable nonce replay protections for sensitive operations, or rely on separately designed durable idempotency with exact command scope. Neither backend/Worker route nor nonce store is implemented. This token helper is not an authorization system by itself.
- No keys, endpoints, secrets, Cloudflare bindings or Worker routes are configured. No live or synthetic athlete data used.

## Test status
- The GitHub connector can fetch and edit files and inspect commit statuses, but does not provide a complete local repository checkout or execution of committed code in this session.
- An attempted HTTPS fetch of the exact GitHub raw test file from the container failed due to unavailable network access. Thus the exact committed Python SQLite test file and TypeScript Vitest suite **have not been executed in this task**.
- Prior task #162's reported representative SQLite harness results were not the exact committed test suite and must not be treated as CI evidence.
- New Worker-auth Vitest cases are **authored only**, not executed. CI and Vercel status should be reported at exact head.
- Before acceptance: checkout exact SHA in an authorized runner; run `python3 -m unittest discover -s infra/race-d1 -p 'test_*.py' -v`, `npm test -- --run src/science/__tests__/raceWorkerAuth.test.ts`, full `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`; validate D1 batch rollback, trigger behavior and retry-after-correction in a real isolated D1 instance.

## Isolation and release blockers
Base44 staging and production have distinct app IDs but share a workspace. No independently verified separation for database, authentication, functions, secrets or provider tokens. No RaceResult schema was found deployed in either app during prior read-only inspection. Do not provision paid resources, enable race writes, deploy Worker, merge or change production.

## Additional risks
- The D1 adapter's `db.batch` success/rollback and `UPDATE RETURNING` behavior remain untested against Cloudflare.
- D1 stored snapshot must be bounded in size, versioned, and have explicit retention; metadata field normalization must match API contract.
- Idempotent correction requests need a durable response/retry protocol distinct from revision CAS.
- Key rotation, issuer identity, nonce replay, rate limits, audit access and incident recovery require implementation and tests.
- Any staging deployment requires independently isolated credentials, database binding, authentication and routing.

**Decision: HOLD.**
