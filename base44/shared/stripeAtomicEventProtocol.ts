// SOURCE ONLY: not connected to the production Stripe handler.
// A provider MUST prove distributed exclusivity and fencing across all workers.
// A Base44 filter-then-create is NOT an atomic reservation.
export type StripeEventLedger = {
  // Must be a complete, strongly consistent read for this exact event key.
  isCommitted: (eventId: string) => Promise<boolean>;
  // Must durably commit exactly one terminal marker; errors are never ignored.
  commit: (eventId: string) => Promise<void>;
};
export type StripeEventLock = {
  // The provider must prevent concurrent work across instances and reject stale
  // holders using fencing/lease ownership. In-process mutexes are test-only.
  runExclusive: <T>(eventId: string, work: () => Promise<T>) => Promise<T>;
};
export type StripeEventResult<T> =
  | { state: 'processed'; value: T }
  | { state: 'duplicate' };

export async function processStripeEventOnce<T>(
  eventId: string,
  lock: StripeEventLock,
  ledger: StripeEventLedger,
  work: () => Promise<T>,
): Promise<StripeEventResult<T>> {
  if (!/^stripe:evt_[A-Za-z0-9]+$/.test(eventId)) throw new Error('invalid_stripe_event_id');
  if (!lock || typeof lock.runExclusive !== 'function' ||
      !ledger || typeof ledger.isCommitted !== 'function' ||
      typeof ledger.commit !== 'function' || typeof work !== 'function') {
    throw new Error('atomic_stripe_reservation_unavailable');
  }
  return lock.runExclusive(eventId, async () => {
    // Check only INSIDE the distributed exclusive scope. A prior check is racy.
    if (await ledger.isCommitted(eventId)) return { state: 'duplicate' as const };
    const value = await work();
    // Never acknowledge success until durable event completion is confirmed.
    // If this fails after work, retry may reapply work. Mutations must be
    // idempotent/reconciled against Stripe authoritative state before release.
    await ledger.commit(eventId);
    return { state: 'processed' as const, value };
  });
}
