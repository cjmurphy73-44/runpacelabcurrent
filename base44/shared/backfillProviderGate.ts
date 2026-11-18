// Provider downloads must never be used to populate a different provider's session.
// Unknown or manual sessions can still recover their explicitly attached files.
export function providerForBackfill(session) {
  const provider = String(session?.source_provider || '').trim().toLowerCase();
  if (provider === 'garmin' || provider === 'coros') return provider;
  return null;
}
