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
      result.imported += returned.length;
      for (const row of returned) {
        if (row && typeof row.date === 'string') persistedDates.add(row.date);
      }
      if (returned.length !== batch.length) {
        result.uncertain += batch.length - returned.length;
        result.errors.push(`Batch ${Math.floor(i / batchSize) + 1}: only ${returned.length} of ${batch.length} rows confirmed. Check saved sessions before retry.`);
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
