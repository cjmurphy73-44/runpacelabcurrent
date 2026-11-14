/**
 * Track confirmed COROS session writes. A fulfilled API call is not evidence
 * that every requested row was persisted: only returned records count as saved.
 * Failures remain visible and safe to retry after re-reading existing sessions.
 */
export async function persistCorosBatches<T extends { date: string }>(
  sessions: T[],
  bulkCreate: (batch: T[]) => Promise<unknown>,
  batchSize = 500,
): Promise<{
  imported: number;
  failed: number;
  uncertain: number;
  persisted_dates: string[];
  errors: string[];
}> {
  if (!Number.isSafeInteger(batchSize) || batchSize < 1) throw new Error('Invalid batch size');
  const persistedDates = new Set<string>();
  const result = { imported: 0, failed: 0, uncertain: 0, persisted_dates: [] as string[], errors: [] as string[] };
  for (let i = 0; i < sessions.length; i += batchSize) {
    const batch = sessions.slice(i, i + batchSize);
    try {
      const returned = await bulkCreate(batch);
      if (!Array.isArray(returned)) {
        result.uncertain += batch.length;
        result.errors.push(`Batch ${Math.floor(i / batchSize) + 1}: write response unverified. Check saved sessions before retry.`);
        continue;
      }
      // A returned row is not proof that a particular requested activity was
      // saved unless its provider identity matches. Never count foreign rows,
      // duplicate echoes, or date-only matches as confirmed writes.
      const requested = new Map<string, T>();
      const identity = (row: any): string | null => {
        if (!row || typeof row !== 'object' || typeof row.date !== 'string') return null;
        if (typeof row.provider_activity_id === 'string' && row.provider_activity_id.trim()) {
          return JSON.stringify([row.athlete_id, row.source_provider, row.provider_activity_id]);
        }
        return null;
      };
      for (const row of batch) {
        const key = identity(row);
        if (key) requested.set(key, row);
      }
      const confirmed = new Set<string>();
      for (const row of returned) {
        const key = identity(row);
        if (!key || !requested.has(key) || confirmed.has(key)) continue;
        const original = requested.get(key)!;
        if (row.date !== original.date) continue;
        confirmed.add(key);
        persistedDates.add(original.date);
      }
      result.imported += confirmed.size;
      const unconfirmed = batch.length - confirmed.size;
      if (unconfirmed > 0) {
        result.uncertain += unconfirmed;
        result.errors.push(`Batch ${Math.floor(i / batchSize) + 1}: only ${confirmed.size} of ${batch.length} activity identities confirmed. Re-read saved sessions before retry.`);
      }
    } catch (e) {
      // A rejected bulk operation may still have partially committed.
      result.uncertain += batch.length;
      result.failed += 1;
      result.errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${e instanceof Error ? e.message : 'write failed'}. Check saved sessions before retry.`);
    }
  }
  result.persisted_dates = [...persistedDates];
  return result;
}


/**
 * Read-after-write reconciliation. A retry may only be attempted after a
 * complete, successful read of the relevant saved sessions. Missing provider
 * IDs, truncated reads, or failed reads must not be interpreted as absence.
 */
export async function reconcileCorosWrites<T extends {
  date: string; athlete_id?: string; source_provider?: string; provider_activity_id?: string;
}>(
  attempted: T[],
  readPersisted: (dates: string[]) => Promise<unknown>,
): Promise<{
  verified: T[]; missing: T[]; retrySafe: boolean; reason: string | null;
  persisted_dates: string[];
}> {
  const blocked = (reason: string) => ({
    verified: [] as T[], missing: [] as T[], retrySafe: false,
    reason, persisted_dates: [] as string[],
  });
  const identity = (row: T) => {
    if (!row || typeof row.date !== 'string' || !row.athlete_id ||
        row.source_provider !== 'coros' || !row.provider_activity_id) return null;
    return JSON.stringify([row.athlete_id, row.source_provider, row.provider_activity_id, row.date]);
  };
  const keys = attempted.map(identity);
  if (keys.some((key) => !key) || new Set(keys).size !== keys.length) return blocked('invalid_or_duplicate_activity_identity');
  if (attempted.length === 0) return { verified: [], missing: [], retrySafe: true, reason: null, persisted_dates: [] };
  let response: unknown;
  try {
    response = await readPersisted([...new Set(attempted.map((row) => row.date))]);
  } catch {
    return blocked('read_after_write_failed');
  }
  // The callback must return the full, non-truncated read result as an array.
  if (!response || typeof response !== 'object' || (response as any).complete !== true ||
      !Array.isArray((response as any).rows)) return blocked('read_after_write_unverified');
  const savedIdentities = (response as any).rows.map((row: T) => identity(row)).filter(Boolean) as string[];
  const counts = new Map<string, number>();
  for (const key of savedIdentities) counts.set(key, (counts.get(key) ?? 0) + 1);
  // Duplicate persisted identities mean the database is already inconsistent.
  // Never mark a subsequent retry safe in that state.
  if (keys.some((key) => (counts.get(key!) ?? 0) > 1)) return blocked('duplicate_persisted_activity_identity');
  const savedKeys = new Set(savedIdentities);
  const verified = attempted.filter((row) => savedKeys.has(identity(row)));
  const missing = attempted.filter((row) => !savedKeys.has(identity(row)));
  return {
    verified, missing, retrySafe: true, reason: null,
    persisted_dates: [...new Set(verified.map((row) => row.date))],
  };
}
