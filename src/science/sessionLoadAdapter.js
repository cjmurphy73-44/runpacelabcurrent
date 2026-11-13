/**
 * Strict read-only adapter for legacy WorkoutSession load fields.
 *
 * Never infer a metric from a nonzero fallback, never equate TSS with TRIMP,
 * and never promote a summary or legacy record into verified-stream data.
 * This adapter is intentionally opt-in until all writers are reconciled.
 */
import { aggregateComparableLoads } from './loadUnitContract.js';

export function classifySessionLoad(session) {
  if (!session || typeof session !== 'object') return { ok: false, reason: 'invalid_session' };
  const hasTrimp = session.session_trimp !== null && session.session_trimp !== undefined;
  const hasTss = session.session_tss !== null && session.session_tss !== undefined;
  if (hasTrimp && hasTss) return { ok: false, reason: 'ambiguous_metric' };
  if (!hasTrimp && !hasTss) return { ok: false, reason: 'missing_metric' };
  const metric = hasTrimp ? 'trimp' : 'tss';
  const value = hasTrimp ? session.session_trimp : session.session_tss;
  // A verified recording requires an explicit, independently established
  // stream-validation flag, not just a provider label or zone_method.
  const provenance = session.load_source === 'stream' && session.load_stream_verified === true
    ? 'verified_stream'
    : session.load_source === 'summary' ? 'summary_estimate'
    : session.load_source == null ? 'summary_estimate' : null;
  if (!provenance) return { ok: false, reason: 'unverified_provenance' };
  const result = aggregateComparableLoads([{ metric, value, provenance }]);
  return result.ok ? { ok: true, metric, value, provenance } : { ok: false, reason: result.reason };
}

export function classifyDailySessionLoads(sessions) {
  if (!Array.isArray(sessions)) return { ok: false, reason: 'invalid_sessions' };
  const entries = [];
  for (const session of sessions) {
    const classified = classifySessionLoad(session);
    if (!classified.ok) return { ok: false, reason: classified.reason, total: null };
    entries.push({ metric: classified.metric, value: classified.value, provenance: classified.provenance });
  }
  return aggregateComparableLoads(entries);
}
