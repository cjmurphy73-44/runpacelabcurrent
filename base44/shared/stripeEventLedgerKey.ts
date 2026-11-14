// Stripe event identity must be unique, present, and safe before ledger access.
// Missing IDs otherwise collapse to the shared key "stripe:undefined".
export function stripeEventLedgerKey(event: { id?: unknown; type?: unknown; livemode?: unknown } | null): string | null {
  if (!event || typeof event.id !== 'string' || !/^evt_[A-Za-z0-9]+$/.test(event.id)) return null;
  if (typeof event.type !== 'string' || !/^[a-z][a-z0-9_.]+$/.test(event.type)) return null;
  if (typeof event.livemode !== 'boolean') return null;
  return 'stripe:' + event.id;
}
