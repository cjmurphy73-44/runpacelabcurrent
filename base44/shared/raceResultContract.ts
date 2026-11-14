import { calculateVDOT } from './vdot.ts';
import { validVdotInputs } from './vdotEvidence.ts';

// Athlete-supplied performances are useful estimates, not independently verified results.
export function validateAttestedRaceResult(input, now = Date.now()) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid race result');
  const { race_date, distance_m, elapsed_seconds, sport, event_name, notes } = input;
  if (sport !== 'running') throw new Error('Only running race results qualify for VDOT');
  if (typeof race_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(race_date)) throw new Error('Invalid race date');
  const parsed = Date.parse(race_date + 'T00:00:00Z');
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== race_date ||
      parsed > now) throw new Error('Race date must be a real, nonfuture date');
  if (!validVdotInputs(elapsed_seconds, distance_m)) throw new Error('Race duration or distance outside Daniels model limits');
  if (event_name != null && (typeof event_name !== 'string' || event_name.length > 120)) throw new Error('Invalid event name');
  if (notes != null && (typeof notes !== 'string' || notes.length > 500)) throw new Error('Invalid notes');
  const vdot = calculateVDOT(elapsed_seconds, distance_m);
  if (!Number.isFinite(vdot) || vdot <= 0) throw new Error('Race performance outside VDOT model domain');
  return { race_date, distance_m, elapsed_seconds, sport: 'running',
    evidence_source: 'athlete_attested', evidence_status: 'self_reported',
    ...(event_name != null ? { event_name } : {}),
    ...(notes != null ? { notes } : {}) };
}

export function bestAttestedRaceResult(results, now = Date.now()) {
  let best = null;
  for (const record of results || []) {
    if (!record || record.evidence_source !== 'athlete_attested' ||
        record.evidence_status !== 'self_reported') continue;
    try {
      const valid = validateAttestedRaceResult(record, now);
      // Avoid promoting old performances to current fitness.
      if (now - Date.parse(valid.race_date + 'T00:00:00Z') > 180 * 86400000) continue;
      const vdot = calculateVDOT(valid.elapsed_seconds, valid.distance_m);
      if (best == null || vdot > best.vdot) best = { vdot, record };
    } catch { /* malformed or unsupported result */ }
  }
  return best;
}

export function raceResultIdentity(record) {
  if (!record || typeof record !== 'object') return null;
  const { race_date, distance_m, elapsed_seconds, sport } = record;
  if (typeof race_date !== 'string' || sport !== 'running' ||
      !Number.isFinite(distance_m) || !Number.isFinite(elapsed_seconds)) return null;
  return [race_date, distance_m, elapsed_seconds, sport].join('|');
}

export function findDuplicateRaceResult(existing, proposed, excludeId = null) {
  const key = raceResultIdentity(proposed);
  if (!key) return null;
  return (existing || []).find(item => item.id !== excludeId &&
    item.evidence_source === 'athlete_attested' &&
    item.evidence_status === 'self_reported' &&
    raceResultIdentity(item) === key) ?? null;
}
