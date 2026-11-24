import { corosActivityId } from './corosActivityIdentity.ts';
import { readCorosArchive, saveCorosArchive, hashCorosRecording } from './corosRecordingArchive.ts';
import { corosAccessToken } from './corosMcp.ts';
import { retrieveOriginalCorosFit } from './corosOriginalFit.ts';
import { env } from './oauth.ts';
import { assertOwnsAthlete } from './ownership.ts';
import { isUsableTelemetry, storageStream } from './streamValidity.ts';
import { parseFitWithLaps } from './workoutParsers.ts';
import { summarizeRecordingCoverage, summarizeRecordingWindows } from './recordingWindows.js';

const MAX_ARCHIVED_SAMPLE_COUNT = 28800;

export async function handleCorosRecording(base44, workoutId: unknown, recover: boolean, analysisOnly = false) {
  const user = await base44.auth.me().catch(() => null);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (typeof workoutId !== 'string' || !workoutId.trim()) {
    return Response.json({ error: 'Workout ID required' }, { status: 400 });
  }
  const workout = await base44.entities.WorkoutSession.get(workoutId).catch(() => null);
  if (!workout || !(await assertOwnsAthlete(base44, user, workout.athlete_id))) {
    return Response.json({ error: 'Workout not found' }, { status: 404 });
  }
  const parts = typeof workout.provider_activity_id === 'string' ? workout.provider_activity_id.split(':') : [];
  const [sportType, labelId] = parts;
  if (workout.source_provider !== 'coros' || parts.length !== 2 ||
    corosActivityId(labelId, sportType) !== workout.provider_activity_id) {
    return Response.json({ error: 'This workout has no confirmed COROS activity ID.' }, { status: 422 });
  }
  const scope = {
    athlete_id: workout.athlete_id, session_id: workout.id, provider_activity_id: workout.provider_activity_id,
  };
  const archive = base44.asServiceRole.entities.CorosRecordingArchive;
  const expectedDuration = workout.duration_seconds || Number(workout.duration_minutes) * 60;
  try {
    let bytes = await readCorosArchive(archive, scope);
    if (!bytes && recover) {
      if (env('COROS_FIT_ARCHIVE_WRITES') !== 'enabled') {
        return Response.json({ error: 'Original COROS recording recovery is temporarily unavailable.' }, { status: 503 });
      }
      const rows = await base44.asServiceRole.entities.CorosConnection.filter({ athlete_id: workout.athlete_id });
      const conn = rows.find(row => row.access_token && row.status !== 'disconnected');
      if (!conn) return Response.json({ error: 'Connect COROS to recover the original recording.' }, { status: 409 });
      const accessToken = await corosAccessToken(conn, base44);
      const fit = await retrieveOriginalCorosFit(accessToken, labelId, sportType, expectedDuration, MAX_ARCHIVED_SAMPLE_COUNT);
      if (!fit) {
        return Response.json({ error: 'COROS did not return a usable original recording within the archive limit.' }, { status: 422 });
      }
      const athlete = await base44.asServiceRole.entities.AthleteProfile.get(workout.athlete_id);
      bytes = await saveCorosArchive(archive, scope, athlete.created_by_id, fit);
    }
    if (!bytes) return Response.json({ status: 'unavailable' });
    const decoded = parseFitWithLaps(bytes);
    if (!decoded || decoded.stream.length > MAX_ARCHIVED_SAMPLE_COUNT || !isUsableTelemetry(decoded.stream, expectedDuration)) {
      return Response.json({ error: 'Archived FIT does not contain a usable recording.' }, { status: 422 });
    }
    const recording = {
      status: 'verified', sample_count: decoded.stream.length, recording_sha256: await hashCorosRecording(bytes),
    };
    const payload = analysisOnly ? {
      ...recording,
      analysis: {
        coverage: summarizeRecordingCoverage({ ...workout, streams: decoded.stream }),
        windows: {
          300: summarizeRecordingWindows(decoded.stream, 300),
          600: summarizeRecordingWindows(decoded.stream, 600),
        },
      },
    } : { ...recording, streams: storageStream(decoded.stream) };
    return Response.json(payload, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return Response.json({ error: 'The original COROS recording could not be verified or retrieved.' }, { status: 502 });
  }
}
