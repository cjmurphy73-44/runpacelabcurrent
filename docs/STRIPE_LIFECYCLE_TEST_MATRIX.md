# Task 1.4: Stripe lifecycle verification matrix

Source-only policy: `base44/shared/stripeLifecycleReconciliation.ts`. No live webhook imports or billing writes.

| Scenario | Expected policy |
| --- | --- |
| Subscription created before paid checkout | Ignore, never grant |
| Verified paid checkout + matching current active subscription | Grant |
| Pending/unpaid checkout | Ignore |
| Renewal fails, current Stripe status past_due | Revoke active entitlement |
| Renewal recovers, current Stripe status active | Restore verified subscription |
| Cancellation, current Stripe status canceled | Revoke, plan free |
| Old cancellation delivered after recovery | Keep current active entitlement |
| Old active update delivered after cancellation | Keep current canceled entitlement |
| Duplicate delivery after same state written | No-op |
| Stripe read fails, ID conflicts, unknown price | Retry/fail closed |

**Important:** This reconciler is only safe if the caller obtains a fresh, authenticated Stripe subscription snapshot for the same test/live mode, verifies initial paid checkout, and serializes writes per subscription with durable event accounting. Out-of-order events cannot be handled safely using webhook payload order alone. The prior `initial_payment_verified` field is a *proposed contract*, not an existing deployed Subscription schema field. Do not wire into the handler without schema migration, atomic reservation and failure recovery acceptance. If Stripe returns a deleted subscription as unavailable, reconcile with an authoritative retrieval/lookup strategy; do not infer cancellation from a network error.

## Validation
Ten Vitest cases authored for the policy; not yet executed in the repository. Requires full CI, signed webhook fixtures, two-worker duplicate delivery, crash between entitlement write and ledger commit, and a Stripe test-mode lifecycle exercise. All production data untouched.
