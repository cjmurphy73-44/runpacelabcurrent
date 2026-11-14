// Deterministic, non-authoritative identity and revision contract.
// These keys are candidates for a future transactionally enforced unique index.
// They DO NOT create uniqueness or concurrency guarantees on their own.
export function canonicalRaceIdentity(input) {
  if (!input || typeof input !== 'object' ||
      typeof input.athlete_id !== 'string' || !input.athlete_id ||
      typeof input.race_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.race_date) ||
      input.sport !== 'running' ||
      !Number.isSafeInteger(input.distance_m) || input.distance_m < 1200 ||
      !Number.isSafeInteger(input.elapsed_seconds) || input.elapsed_seconds < 180) {
    throw new Error('invalid_race_identity');
  }
  // Length prefix avoids ambiguity if identifiers contain separator characters.
  const fields = [input.athlete_id, input.race_date, input.sport,
    String(input.distance_m), String(input.elapsed_seconds)];
  return fields.map(v => v.length + ':' + v).join('');
}

export function requireExpectedRaceRevision(expected, current) {
  if (!Number.isSafeInteger(expected) || expected < 1 ||
      !Number.isSafeInteger(current) || current < 1 ||
      expected !== current) throw new Error('race_revision_conflict');
  return current + 1;
}

export function describeAtomicRaceBackend(capabilities) {
  // Either a transactional database unique constraint + CAS, or an external
  // service that supplies both guarantees, is needed. A simple lock TTL is not enough.
  const valid = capabilities?.uniqueRaceKey === true &&
    capabilities?.atomicCompareAndSwap === true &&
    capabilities?.durableOwnerAssignment === true &&
    capabilities?.isolatedStaging === true;
  return { writeSafe: valid, reason: valid ? null : 'atomic_backend_not_verified' };
}
