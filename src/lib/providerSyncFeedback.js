// Describes what the provider returned, not unverified stream completeness.
export function providerSyncFeedback(data, { recoveryOnly = false } = {}) {
  if (data?.success !== true || data.error) throw new Error(data?.error || 'The sync result could not be confirmed. Check status before retrying.');
  const count = key => {
    const value = data[key] ?? 0;
    if (!Number.isInteger(value) || value < 0) throw new Error('The sync result contained invalid counts.');
    return value;
  };
  if (!Object.hasOwn(data, 'imported') && !Object.hasOwn(data, 'recovery_imported')) throw new Error('The sync result was incomplete.');
  const imported = count('imported');
  const recovery = count('recovery_imported');
  const errors = count('errors');
  const duplicates = count('duplicates');
  if (data.toolErrors != null && !Array.isArray(data.toolErrors)) throw new Error('The sync result contained invalid provider errors.');
  const providerErrors = data.toolErrors?.length || 0;
  if (!imported && !recovery && !errors && !providerErrors) return recoveryOnly ? 'No recovery days were imported in this sync. Provider availability may vary.' : 'No new workouts or recovery days were imported in this sync.';
  const parts = [recoveryOnly ? `${imported} recovery days imported` : `${imported} workouts imported`];
  if (recovery) parts.push(`${recovery} recovery days imported`);
  if (duplicates) parts.push(`${duplicates} already present`);
  if (errors) parts.push(`${errors} failed or skipped; the sync is incomplete. Retry or review the connection`);
  if (providerErrors) parts.push(`${providerErrors} provider requests failed; some data may be missing. Retry or review the connection`);
  return parts.join(' · ') + '.';
}
