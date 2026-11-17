# Commercial claims evidence gate (MKT-003)

**Created:** 2026-11-17. **Status:** draft / unverified. **Release:** HOLD.

This register is an acceptance specification, not proof that any product claim is true. Before publishing or modifying pricing, onboarding, landing, social, advertising, or checkout copy, a reviewer must trace every material claim to an authoritative, current source. Unknown is a blocker, not permission to extrapolate. Do not inspect or modify production customer/payment records to fill this register.

## Claim-to-evidence acceptance matrix

| Claim surface | Example claim to audit (not approved copy) | Required authoritative evidence | Fail-closed disposition |
| --- | --- | --- | --- |
| Free plan limits | History retention, imports/day, AI messages/week | Effective server entitlement rules and configured tier limits at the exact published backend revision; synthetic boundary tests | Do not state numeric quotas until reconciled |
| Paid tiers and prices | AUD amount, billing interval, included features | Current configured Stripe Price IDs, server-side tier mapping, tax/currency rules, signed-off public pricing copy; no live charge | Do not assert a price is purchasable until verified |
| Checkout | Secure payment and immediate upgrade | Authenticated server checkout session, Stripe URL allowlist, webhook processing and persisted entitlement synthetic tests | Describe checkout as pending until entitlement confirmed |
| Cancellation/refund | Cancel anytime, access until period end, refund exclusions | Current terms/refund policy, Stripe lifecycle behavior and entitlement state transitions | Do not promise timing or refund outcomes without tests and policy review |
| Garmin/COROS sync | Automatic sync, original activity data, reliable imports | Authorized provider scope, original recording retrieval and per-activity provenance, retry/idempotency and partial-failure evidence | Say availability varies; never imply summary-only equals verified stream |
| Physiology and coaching | Measured zones, readiness, individualized prescriptions | Verified dense stream, model input provenance, scientific validation and user-facing fallback states | Never label estimated or missing measurements as measured |
| Customer proof | Popularity, testimonials, customer counts, conversion, results | Consent and dated independently verified aggregates or authorized testimonial | Remove popularity/ranking/results claims until evidence exists |
| Security/privacy | Protected athlete data, deletion, coach access | RLS and cross-account negative tests, deletion coverage, published policy review | Avoid absolute security promises |
| Launch readiness | Available now, beta ready, production verified | Exact source SHA, CI, Base44 checkpoint, Vercel deployment, isolated browser evidence and signed release approval | Draft only under release HOLD |

## Mandatory evidence record for each claim

Record **claim ID**, exact user-visible wording and route, owner, evidence source/path, source revision/SHA, test command and result, verification date, reviewer, limitations, and disposition (**approved / revise / remove / unverified**). Screenshots must be synthetic or redacted. Never record tokens, payment details, athlete data, customer email addresses, or proprietary model derivations.

A claim is approved only when its evidence is current for the proposed release. A successful PR check does not prove deployment; a deployment does not prove live behavior; a checkout return query string does not prove payment or entitlement. Any unverified dependency keeps the claim **unverified**.

## Reproducible acceptance checks (synthetic only)

1. Audit every price, quota, connection promise, popularity badge and cancellation statement on `/`, `/subscribe`, onboarding and related public FAQ against the matrix.
2. For free-plan claims, assert both permitted and denied synthetic entitlements at quota boundaries. Never use an actual subscriber.
3. For checkout, assert spoofed browser `user_id` is ignored, invalid external URLs fail closed, checkout-return status alone does not grant access, and webhook replay is idempotent.
4. For sync and physiology, assert a summary-only workout cannot produce verified stream zones; a failed FIT fetch must be visibly distinguished from success.
5. Reconcile against draft PRs #244, #245, #250 and #252 before editing overlapping application code. Record exact-head `npm run typecheck`, `npm run test:ci`, `npm run lint`, `npm run build`, CI and browser results separately. If unavailable, mark **not executed**.
6. Require separate written approval before any merge, deployment, live billing activation, advertising, social publishing, retailer/provider contact or spending.

**First application:** The main `src/pages/Subscribe.jsx` currently renders a “Most popular” badge based on `d.highlighted`. This is a marketing claim requiring measured, consent-safe evidence, not a styling preference. Do not change that file here because concurrent billing drafts touch it. Follow-up: remove or replace the badge in a conflict-reconciled isolated UI PR unless credible evidence is provided.

**Related work:** COM-001 issue #62, MKT-002 PR #252, BILL-004/#005/#006 PRs #244/#245/#250, ingestion issue #210, release-safety PR #247. This register changes no product runtime behavior and makes no assertion of production acceptance.
