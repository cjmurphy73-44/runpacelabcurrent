# Stripe atomic event delivery: release gate (AUDIT-134 task 1.3)

**State: SOURCE ONLY, NO PRODUCTION CALLERS.** The pure protocol and synthetic concurrency tests are not proof that Base44 supports distributed atomic reservation.

## Verified in repository
- `WebhookEvent.jsonc` says event_id is unique in prose, but has no explicit unique-index/conditional-insert declaration.
- Current webhook uses `WebhookEvent.filter` before subscription mutation and `WebhookEvent.create` afterward, swallowing both read and write failures.
- This does not establish exactly-once processing under simultaneous deliveries or worker crash.
- Existing recording-commit source makes the same distinction: an in-process mutex or read-then-create is not a distributed lock.

## Required provider before wiring
1. A backend-supported atomic unique event reservation or distributed per-event lock with fencing, ownership and lease-expiry semantics; verify with Base44/platform documentation and **two independent worker instances**.
2. A strongly consistent, exhaustive committed-event lookup within the exclusive scope, and durable terminal marker write that fails closed.
3. Safe crash recovery: if a subscription write commits but event marker does not, replay must reconcile authoritative Stripe subscription state, not blindly replay a stale event.
4. Test/live isolation, event identity validation, and entitlement rules from consolidated draft PR #141.
5. For out-of-order subscription updates, verify authoritative Stripe state/version and do not let an older event restore canceled access.
6. Use only isolated Stripe test-mode accounts, never real payments or athlete data.

## Source-only protocol
`base44/shared/stripeAtomicEventProtocol.ts` accepts an injected distributed exclusive lock and ledger, runs lookup inside lock, executes mutation, then awaits durable commit. Missing providers, read failures, lock failures and commit failures reject rather than acknowledge success.

The in-memory test lock in `stripeAtomicEventProtocol.test.ts` models mutual exclusion but **does not prove** the backend provider. The protocol is deliberately not imported by the live webhook until all gates above are met.

## Failure caveat
If mutation succeeds and terminal event commit fails, a retry may repeat the mutation. This protocol alone is insufficient for exactly-once effects across Base44 entities and the event ledger. Either a shared atomic transaction or provably idempotent reconciliation is required before production integration.
