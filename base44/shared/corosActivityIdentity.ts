/**
 * COROS provider identity is stronger than approximate date/duration/distance.
 * Never mistake two separate same-day COROS activities for duplicates if both
 * carry different provider IDs. Older imported rows without IDs retain a
 * conservative approximate fallback until a safe backfill becomes available.
 */
export function corosActivityId(labelId: unknown, sportType: unknown): string | null {
  if (labelId == null || sportType == null) return null;
  const label = String(labelId).trim();
  const sport = String(sportType).trim();
  if (!/^\d{1,24}$/.test(label) || !/^\d{1,8}$/.test(sport)) return null;
  return `${sport}:${label}`;
}

export function isDuplicateCorosSession(
  existing: {
    date?: string; sport?: string; duration_minutes?: number; distance_km?: number;
    source_provider?: string; provider_activity_id?: string;
  },
  candidate: {
    date?: string; sport?: string; duration_minutes?: number; distance_km?: number;
    source_provider?: string; provider_activity_id?: string;
  },
): boolean {
  if (existing.date !== candidate.date) return false;
  const existingId = existing.provider_activity_id;
  const candidateId = candidate.provider_activity_id;
  if (candidateId && existingId) {
    return existing.source_provider === candidate.source_provider && existingId === candidateId;
  }
  // When both IDs are known, the provider knows these are distinct activities.
  // For legacy imported sessions missing identity, use historical tolerance.
  return existing.sport === candidate.sport
    && Math.abs((existing.duration_minutes || 0) - (candidate.duration_minutes || 0)) < 1
    && Math.abs((existing.distance_km || 0) - (candidate.distance_km || 0)) < 0.1;
}
