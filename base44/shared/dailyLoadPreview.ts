// Read-only server-side aggregation preview. No DailyMetrics writes.
// This intentionally refuses legacy/ambiguous load instead of silently mixing units.
export type LoadRow = {
  date?: string;
  session_trimp?: number | null;
  session_tss?: number | null;
  load_source?: string | null;
  load_stream_verified?: boolean;
};
export type DailyLoadPreview = {
  ok: boolean;
  reason?: string;
  metric?: 'trimp' | 'tss';
  total?: number;
  verified?: number;
  summary?: number;
};
export function previewDailyLoad(rows: LoadRow[]): DailyLoadPreview {
  if (!Array.isArray(rows) || rows.length === 0) return { ok: false, reason: 'no_sessions' };
  let metric: 'trimp' | 'tss' | undefined;
  let total = 0, verified = 0, summary = 0;
  for (const row of rows) {
    if (!row || typeof row !== 'object') return { ok: false, reason: 'invalid_session' };
    const hasTrimp = row.session_trimp != null;
    const hasTss = row.session_tss != null;
    if (hasTrimp === hasTss) return { ok: false, reason: 'ambiguous_or_missing_metric' };
    const kind = hasTrimp ? 'trimp' : 'tss';
    if (metric && metric !== kind) return { ok: false, reason: 'mixed_load_metrics' };
    metric = kind;
    const value = hasTrimp ? row.session_trimp : row.session_tss;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return { ok: false, reason: 'invalid_load' };
    // An explicit stream label alone is insufficient proof of verified telemetry.
    if (row.load_source === 'stream' && row.load_stream_verified !== true) return { ok: false, reason: 'unverified_stream' };
    if (row.load_source && !['stream', 'summary'].includes(row.load_source)) return { ok: false, reason: 'unknown_provenance' };
    total += value;
    if (row.load_source === 'stream') verified += value;
    else summary += value;
    if (![total, verified, summary].every(Number.isFinite)) return { ok: false, reason: 'overflow' };
  }
  return { ok: true, metric, total, verified, summary };
}
export function previewLoadByDate(rows: LoadRow[]): Record<string, DailyLoadPreview> {
  const groups: Record<string, LoadRow[]> = {};
  for (const row of rows) {
    if (!row || typeof row.date !== 'string' || !/^\\d{4}-\\d{2}-\\d{2}$/.test(row.date)) {
      return { _invalid: { ok: false, reason: 'invalid_date' } };
    }
    (groups[row.date] ||= []).push(row);
  }
  return Object.fromEntries(Object.entries(groups).map(([date, group]) => [date, previewDailyLoad(group)]));
}
