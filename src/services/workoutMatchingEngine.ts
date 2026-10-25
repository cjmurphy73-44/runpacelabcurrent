export interface MatchCandidate {
  id: string;
  name?: string;
  status?: string;
  confidenceScore: number;
  matchedActivityId: string;
  matchStatus?: string;
}

export const workoutMatchingEngine = {
  match: (_session: any, _assets: any[]) => [],
  matchAll: (_ingested: any, _candidates: any[]) => []
};
