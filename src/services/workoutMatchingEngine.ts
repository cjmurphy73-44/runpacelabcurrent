// Read-only suggestions. Never persist a match or infer verified completion.
export interface MatchCandidate {
  id: string;
  name?: string;
  status?: string;
  confidenceScore: number;
  matchedActivityId: string;
  matchStatus?: string;
}
export interface PlannedActualCandidate {
  sessionId: string;
  scheduledWorkoutId: string;
  matchStatus: 'EXACT' | 'COMPLETED_SHORT' | 'COMPLETED_EXCEEDED';
  confidenceScore: number;
  varianceDetails: { completionRatio: number };
}
const dateKey = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
const validDuration = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;
function candidate(actual: any, planned: any): PlannedActualCandidate | null {
  if (!actual?.sessionId || !planned?.id ||
      !dateKey(actual.date) || actual.date !== planned.date ||
      !actual.sport || actual.sport !== planned.sport ||
      !validDuration(actual.durationMinutes) || !validDuration(planned.targetDurationMinutes)) return null;
  const ratio = actual.durationMinutes / planned.targetDurationMinutes;
  // Far-out durations are not reliable matches. Never force a guess.
  if (ratio < 0.5 || ratio > 1.5) return null;
  const matchStatus = ratio < 0.95 ? 'COMPLETED_SHORT' :
    ratio > 1.05 ? 'COMPLETED_EXCEEDED' : 'EXACT';
  // The confidence is a deterministic ranking heuristic, NOT proof of identity.
  const confidenceScore = Number(Math.max(0, 1 - Math.abs(1 - ratio)).toFixed(3));
  return { sessionId: actual.sessionId, scheduledWorkoutId: planned.id,
    matchStatus, confidenceScore, varianceDetails: { completionRatio: ratio } };
}
export const workoutMatchingEngine = {
  // Asset-level matching is not implemented; never fabricate candidates.
  match: (_session: any, _assets: any[]): MatchCandidate[] => [],
  matchAll: (ingested: any[], scheduled: any[]): PlannedActualCandidate[] => {
    if (!Array.isArray(ingested) || !Array.isArray(scheduled)) return [];
    const results: PlannedActualCandidate[] = [];
    for (const actual of ingested) for (const planned of scheduled) {
      const suggestion = candidate(actual, planned);
      if (suggestion) results.push(suggestion);
    }
    return results.sort((a, b) => b.confidenceScore - a.confidenceScore ||
      a.sessionId.localeCompare(b.sessionId) || a.scheduledWorkoutId.localeCompare(b.scheduledWorkoutId));
  },
};
