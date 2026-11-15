/**
 * Fail-closed contract for combining training loads.
 *
 * TRIMP and TSS are not interchangeable numeric units. Source provenance
 * (stream/summary) is a separate dimension from the load metric.
 * This pure helper intentionally does not infer metric from a field's magnitude.
 */
const VALID_METRICS = new Set(['trimp', 'tss']);
const VALID_PROVENANCE = new Set(['verified_stream', 'summary_hr', 'summary_estimate']);

export function aggregateComparableLoads(entries) {
  if (!Array.isArray(entries)) return { ok: false, reason: 'invalid_entries', total: null };
  let metric = null;
  let total = 0;
  let verified = 0;
  let summary = 0;
  for (const entry of entries) {
    if (!entry || !VALID_METRICS.has(entry.metric) ||
        !VALID_PROVENANCE.has(entry.provenance) ||
        typeof entry.value !== 'number' || !Number.isFinite(entry.value) || entry.value < 0) {
      return { ok: false, reason: 'invalid_load', total: null };
    }
    if (metric !== null && entry.metric !== metric) {
      return { ok: false, reason: 'mixed_load_metrics', total: null };
    }
    metric = entry.metric;
    total += entry.value;
    if (entry.provenance === 'verified_stream') verified += entry.value;
    else summary += entry.value;
    if (![total, verified, summary].every(Number.isFinite)) {
      return { ok: false, reason: 'load_overflow', total: null };
    }
  }
  if (metric === null) return { ok: false, reason: 'no_loads', total: null };
  return {
    ok: true, metric, total, verified, summary,
    verifiedShare: total === 0 ? null : verified / total,
  };
}
