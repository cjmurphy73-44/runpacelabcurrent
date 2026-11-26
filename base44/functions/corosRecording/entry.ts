import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { handleCorosRecording } from '../../shared/corosRecordingHandler.ts';

Deno.serve(async (request) => {
  const body = await request.json().catch(() => null);
  const action = body?.action;
  if (action !== 'read_recording' && action !== 'recover_recording' &&
    action !== 'analyze_recording' && action !== 'restore_recording') {
    return Response.json({ error: 'Unknown recording action' }, { status: 400 });
  }
  const base44 = createClientFromRequest(request);
  return handleCorosRecording(base44, body.workout_id, action, body.response_mode === 'analysis');
});
