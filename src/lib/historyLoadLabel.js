// Workout history presentation only. Never combine TRIMP and TSS.
export function historyLoadLabel(workout) {
  const trimp = workout?.session_trimp;
  const tss = workout?.session_tss;
  const hasTrimp = trimp != null && trimp !== '';
  const hasTss = tss != null && tss !== '';
  const valid = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0;
  if (hasTrimp && hasTss) return { amount: 'Load unavailable', detail: 'Mixed load units' };
  if (hasTrimp && !valid(trimp)) return { amount: 'Load unavailable', detail: 'Invalid TRIMP' };
  if (hasTss && !valid(tss)) return { amount: 'Load unavailable', detail: 'Invalid TSS' };
  if (!hasTrimp && !hasTss) return { amount: 'Load unavailable', detail: 'No load recorded' };
  const metric = hasTrimp ? 'TRIMP' : 'TSS';
  const amount = hasTrimp ? trimp : tss;
  const source = workout?.load_source;
  const detail = source === 'summary' ? 'Estimated from summary'
    : source === 'stream' ? 'Recording-derived, verification pending'
    : 'Source unverified';
  return { amount: `${Math.round(amount)} ${metric}`, detail };
}
