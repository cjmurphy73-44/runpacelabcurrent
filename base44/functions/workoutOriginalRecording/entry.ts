import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { handleWorkoutOriginalRecording } from '../../shared/workoutOriginalRecording.ts';

Deno.serve((request) => {
  const base44 = createClientFromRequest(request);
  return handleWorkoutOriginalRecording(base44, request);
});
