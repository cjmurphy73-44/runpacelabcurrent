export interface MatchCandidate {
  id: string;
  name?: string;
  status?: string;
  confidenceScore: number;
  matchedActivityId: string;
  matchStatus?: string;
}
