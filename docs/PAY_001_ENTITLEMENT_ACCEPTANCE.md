# PAY-001: Stripe entitlement transition acceptance contract

**Status:** specification and synthetic test plan only. **Release:** HOLD. This document does not assert live Stripe, Base44, or Vercel acceptance.

## Trust boundary

The server must derive the authenticated athlete identity and current entitlement from authoritative subscription records. Neither a browser-selected plan, client-submitted athlete ID, checkout success redirect, nor unsigned webhook payload can grant access. Preserve current behaviour until the implementation and tests are reconciled against the exact repository head.

## Independently executable synthetic acceptance cases

Use isolated fake Stripe events, a fake subscription store, and a fixed clock. Assert the persisted subscription state **and** the result of a fresh server-side entitlement lookup after each event. Never call live Stripe or Base44.

| Case | Input and order | Required result |
|---|---|---|
| P1 | Checkout session completed but payment status unpaid | No paid entitlement |
| P2 | Checkout completed and confirmed paid, matching athlete/customer, expected currency and price | Exactly one eligible subscription; access only after authoritative persistence |
| P3 | Same signed event delivered twice | One transition; no duplicate entitlement or side effect |
| P4 | Two different events for the same subscription delivered out of order | Reconcile against authoritative subscription status; stale event must not resurrect access |
| P5 | Invalid signature, expired timestamp, missing signature | Reject before persistence or entitlement mutation |
| P6 | Valid event with mismatched customer, athlete metadata, price or currency | Fail closed; no cross-account grant |
| P7 | Trial or active subscription becomes past_due, unpaid, canceled, or expired | Access follows explicitly documented server policy; no indefinite stale cache |
| P8 | Cancellation at period end with future paid-through timestamp | Apply the documented period-end policy; remove access at expiry |
| P9 | Refund, dispute, or payment reversal | Reconcile against the explicit policy; no silent permanent grant |
| P10 | Two simultaneous identical webhook deliveries | Idempotent atomic claim or equivalent transactional guard; no double grant |
| P11 | Webhook persistence fails after event receipt | Retry can safely complete; do not acknowledge success prematurely |
| P12 | Forged browser request changes plan, owner, or subscription ID | No server-side access escalation |
| P13 | Free-tier athlete accesses paid endpoint directly without UI | Deny at backend, not merely in FeatureGate |
| P14 | Authenticated athlete A requests athlete B's billing or entitlement record | Deny without exposing existence or identifiers |
| P15 | Test-mode checkout or synthetic marker reaches live entitlement path | Never grants live access |

## Evidence required before beta

1. Pin the exact GitHub commit, test runner version, and full test command/output; record the failing baseline for any discovered defect.
2. Verify each case against the real server implementation using synthetic inputs, including negative authorization and concurrent retries.
3. Separately establish isolated Stripe test-mode keys, product/price mapping, webhook destination, and Base44 tenant before any integration test. No production customer or payment data.
4. Reconcile displayed pricing and advertised features with server-side entitlements. Record discrepancies as blockers rather than changing prices or enabling billing.
5. Capture exact-head CI, review and Vercel provenance; a successful build is not a deployment or live checkout verification.
6. Require separate explicit approval for any real charge, refund, live billing configuration or deployment.

**Priority:** P0, before public paid beta. **Related:** commercial issue #62, beta readiness phase 2, MVP roadmap P4 and BILL-003 in the atomic backlog.
