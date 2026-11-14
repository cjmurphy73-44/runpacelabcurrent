/**
 * Bounded Base44 offset pagination with fail-closed completeness checks.
 * A stable sort is requested, but concurrent inserts/deletes can still shift
 * offsets. This helper is for diagnostic previews, never proof of absence
 * for a concurrent mutation.
 */
export async function readDiagnosticPages<T extends { id?: string; created_date?: string }>(
  fetchPage: (limit: number, skip: number) => Promise<T[]>,
  options: { pageSize?: number; maxRows?: number } = {},
): Promise<T[]> {
  const pageSize = options.pageSize ?? 100;
  const maxRows = options.maxRows ?? 1000;
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 5000 ||
      !Number.isInteger(maxRows) || maxRows < pageSize || maxRows > 5000) {
    throw new Error('INVALID_PAGINATION_LIMIT');
  }
  const rows: T[] = [];
  const seen = new Set<string>();
  let previousCreated: string | null = null;
  for (let skip = 0; skip <= maxRows; skip += pageSize) {
    const page = await fetchPage(pageSize, skip);
    if (!Array.isArray(page) || page.length > pageSize) throw new Error('INCOMPLETE_HISTORY_READ');
    for (const row of page) {
      if (!row || typeof row.id !== 'string' || !row.id ||
          typeof row.created_date !== 'string' || !row.created_date) {
        throw new Error('UNSTABLE_PAGINATION_ORDER');
      }
      if (seen.has(row.id)) throw new Error('DUPLICATE_PAGINATION_ROW');
      if (previousCreated !== null && row.created_date <= previousCreated) {
        // Equal timestamps are ambiguous across page boundaries with a
        // single-column sort, so reject rather than silently skip rows.
        throw new Error('UNSTABLE_PAGINATION_ORDER');
      }
      seen.add(row.id);
      previousCreated = row.created_date;
      rows.push(row);
      if (rows.length > maxRows) throw new Error('HISTORY_READ_LIMIT');
    }
    if (page.length < pageSize) return rows;
  }
  throw new Error('HISTORY_READ_LIMIT');
}
