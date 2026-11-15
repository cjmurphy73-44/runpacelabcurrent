# OAuth state hardening candidate

Release HOLD. Local branch `fix/oauth-state-secret-boundary-20261115`, based on GitHub main `5a9532b59da0cddb34e223dff536ef1700ef66d4`. No push, deployed schema, function invocation, provider request, credential change or production write.

## Reconciliation

Current main still uses the public COROS client ID for state signing and a predictable wearable fallback. Targeted GitHub PR searches for OAuth/state/security did not locate a dedicated fix; that is not proof of an exhaustive inventory. Existing security/privacy/deletion PR #195 was fetched at exact head `62a205a269ab58644751b59d02c694961282eab8` and does not change either OAuth handler or these state helpers. Its exact-head GitHub Actions run `43695181573` succeeded. Its ownership/deletion work remains separate; do not copy or overwrite that branch.

## Behavior

- Replaces both vulnerable state formats with `attempt-record-id.random-256-bit-nonce`. No public client ID or fallback signing key is used. Neither athlete ID nor COROS PKCE verifier is exposed in state.
- Keeps trusted provider, initiating owner, athlete, exact redirect URI, nonce hash, separate browser-binding hash, issue time and ten-minute expiry in a new service-only OAuthAttempt entity. Ordinary client CRUD is denied for all operations.
- Requires creator ownership at issuance and rechecks it at callback. A client-editable linked athlete ID cannot authorize an attempt for a different creator.
- Sends a separate `Secure; HttpOnly; SameSite=Lax; Path=/` host cookie and verifies it at callback. A valid attempt from another browser is rejected. The cookie is never included in the JSON authorize payload.
- Requires `deleteMany` to confirm `success:true, deleted:1` for the exact attempt bindings before token exchange. Boolean success, zero/multiple rows or storage errors fail closed. Missing, malformed, expired, future-issued, mismatched, replayed or unconfirmed attempts do not reach provider exchange/connection writes in synthetic tests.
- A consumed attempt stays consumed if the token exchange subsequently fails: the athlete must start a fresh connection. Existing connections are not deleted when state fails verification or the provider returns no usable token.
- Fixes wearable authorization reading an already-consumed JSON request body; the router passes the parsed provider body once.
- Adds no-store responses, no-referrer callback pages and removes raw token-exchange error payloads from the changed callback responses/logs.

## Required isolated runtime acceptance before merge/deploy

1. Prove production and staging auth, data, functions, secrets, storage and effective SDK routing are isolated before creating test attempts. Do not use production records.
2. Apply the entity only under a separately approved isolated staging action. Verify ordinary users, coaches and anonymous callers cannot list/get/create/update/delete its rows, including fields containing PKCE material.
3. Verify the actual pinned backend SDK/API `deleteMany` filter understands `id` and all binding fields and reports only active records actually consumed. Execute simultaneous identical callbacks across separate runtime workers; exactly one deletion must return `deleted:1`, all others zero/reject, with one token exchange. SDK type definitions and a synthetic Map do not prove these hosted semantics. Soft-delete/trash behavior must not allow a second reported consumption. STOP if this cannot be established; do not replace it with read-then-update or a process-local lock.
4. Verify the browser receives the Set-Cookie header through the Base44 SDK/proxy, stores it on the exact callback host, and returns it on the top-level provider callback. The Vercel frontend host, Base44 API host and registered callback host may differ. If cookie forwarding, cross-origin credentials, host alignment or platform header propagation is unavailable, the current candidate fails closed and requires a reviewed same-origin initiation/callback transport. Do not weaken browser binding to make a happy path pass.
5. Exercise real browser callback contracts with a synthetic account: valid flow, missing/forged/expired/other-browser/provider/owner/redirect state, replay and provider rejection. No live wearable account or provider call is authorized by local tests. Confirm supportable reconnect behavior when old signed states are rejected on rollout.
6. Coordinate OAuthAttempt cleanup with existing deletion PR #195. Account deletion must revoke attempts for every owned profile; expired/consumed rows and trashed PKCE material need an explicit retention/purge policy and supported implementation. This candidate does not implement that purge or claim full erasure.
7. Independently review body-size/rate limits for initiation/callback and complete token/connection authorization, provider callback URLs, scopes and token-error logging across unchanged paths. This patch is not a complete provider-security certification.
8. Establish exact deployed entity/function source mappings; rerun complete current security scan when permitted. CI green is source evidence, not hosted proof.

## Validation

The actual COROS and wearable request routers are executed in an isolated Node VM with synthetic SDK/provider adapters. Shared state tests model one active-row consumer; they explicitly do not certify Base44 concurrency. Tests cover browser binding, state/owner/provider/redirect mismatches, absent configuration, expiry, replay, one-time consumption result shape, competing callbacks, service-only schema and readback failures.

Final check totals and exact commit are recorded in the release-gate tracker after validation. Do not infer merge readiness from this document.
