import { GarminAdapter } from './telemetry/GarminAdapter';
import { StravaAdapter } from './telemetry/StravaAdapter';
import { reconcileStreams } from '../utils/streamReconciler';
import { NormalizedStream, WorkloadMetricData } from '../science/types';

export const WorkloadService = {
  getAthleteWorkload: async (athleteId: string): Promise<WorkloadMetricData> => {
    const response = await fetch(`/api/athletes/${athleteId}/workload`);
    if (!response.ok) throw new Error('Failed to fetch workload');
    return response.json();
  },

  ingestAndReconcile: (rawGarmin: any, rawStrava: any): NormalizedStream[] => {
    const garminStreams = GarminAdapter.parsePayload(rawGarmin);
    const stravaStreams = StravaAdapter.parsePayload(rawStrava);
    return reconcileStreams(garminStreams, stravaStreams);
  }
};
