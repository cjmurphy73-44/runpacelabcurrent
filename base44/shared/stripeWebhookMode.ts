// Keep signed Stripe events in their configured live/test credential boundary.
// Never substitute live credentials for missing test credentials.
export function resolveStripeWebhookMode(
  event: { livemode?: unknown } | null,
  verifiedLive: boolean,
  verifiedTest: boolean,
  liveKey: string | null | undefined,
  testKey: string | null | undefined,
): { ok: true; mode: 'live' | 'test'; apiKey: string } | { ok: false; reason: string } {
  if (!event || typeof event.livemode !== 'boolean') return { ok: false, reason: 'invalid_event_mode' };
  if (event.livemode) {
    return verifiedLive && !!liveKey
      ? { ok: true, mode: 'live', apiKey: liveKey }
      : { ok: false, reason: 'live_signature_or_key_mismatch' };
  }
  return verifiedTest && !!testKey
    ? { ok: true, mode: 'test', apiKey: testKey }
    : { ok: false, reason: 'test_signature_or_key_mismatch' };
}
