import { corosActivityId } from './corosActivityIdentity.ts';
import { readCorosArchive, saveCorosArchive, hashCorosRecording } from './corosRecordingArchive.ts';
import { corosAccessToken } from './corosMcp.ts';
import { retrieveOriginalCorosFit } from './corosOriginalFit.ts';
import { env } from './oauth.ts';
import { assertOwnsAthlete } from './ownership.ts';
import { inlineWorkoutStream, isUsableTelemetry, storageStream } from './streamValidity.ts';
import { parseFitWithLaps } from './workoutParsers.ts';
import { summarizeRecordingCoverage, summarizeRecordingWindows } from './recordingWindows.js';
import { resolveTimeInZone } from './hrZones.ts';
import { claimRateLimit } from './rateLimit.ts';
import { resolveSessionLoad } from './loadModel.ts';
import { recomputeCTLATLTSB } from './ctlRecalc.ts';

const MAX_ARCHIVED_SAMPLE_COUNT = 28800;
type RecordingAction = 'read_recording' | 'recover_recording' | 'analyze_recording' | 'restore_recording';

export async function handleCorosRecording(base44, workoutId: unknown, action: RecordingAction, analysisOnly = false) {
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
    let source = 'archive';
    if (!bytes && action !== 'read_recording') {
      if (action === 'recover_recording' && env('COROS_FIT_ARCHIVE_WRITES') !== 'enabled') {
        return Response.json({ error: 'Original COROS recording recovery is temporarily unavailable.' }, { status: 503 });
      }
      if (!claimRateLimit(`coros-recording:${user.id}`, 8, 60_000)) {
        return Response.json({ error: 'Too many recording requests. Try again in a minute.' }, { status: 429 });
      }
      const rows = await base44.asServiceRole.entities.CorosConnection.filter({ athlete_id: workout.athlete_id });
      const conn = rows.find(row => row.access_token && row.status !== 'disconnected');
      if (!conn) return Response.json({ error: 'Connect COROS to recover the original recording.' }, { status: 409 });
      const accessToken = await corosAccessToken(conn, base44);
      const fit = await retrieveOriginalCorosFit(accessToken, labelId, sportType, expectedDuration, MAX_ARCHIVED_SAMPLE_COUNT);
      if (!fit) {
        return Response.json({ error: 'COROS did not return a usable original FIT for this workout. You can import the original file if you have it.' }, { status: 422 });
      }
      if (action === 'analyze_recording' || action === 'restore_recording') {
        bytes = fit;
        source = 'provider';
      } else {
        const athlete = await base44.asServiceRole.entities.AthleteProfile.get(workout.athlete_id);
        bytes = await saveCorosArchive(archive, scope, athlete.created_by_id, fit);
      }
    }
    if (!bytes) return Response.json({ status: 'unavailable' });
    const decoded = parseFitWithLaps(bytes);
    if (!decoded || decoded.stream.length > MAX_ARCHIVED_SAMPLE_COUNT || !isUsableTelemetry(decoded.stream, expectedDuration)) {
      return Response.json({ error: 'The original FIT does not contain a usable recording.' }, { status: 422 });
    }
    const recording = {
      status: 'verified', source, sample_count: decoded.stream.length, recording_sha256: await hashCorosRecording(bytes),
    };
    if (analysisOnly || action === 'analyze_recording' || action === 'restore_recording') {
      const athlete = await base44.asServiceRole.entities.AthleteProfile.get(workout.athlete_id);
      const coverage = summarizeRecordingCoverage({ ...workout, streams: decoded.stream });
      const restHr = athlete?.resting_hr || 60;
      const maxHr = athlete?.max_heart_rate || workout.max_hr || 190;
      const zones = resolveTimeInZone({
        stream: decoded.stream, durationSeconds: expectedDuration, restHr, maxHr, measuredOnly: true,
      });
      let restored_workout = null;
      let training_load_refreshed = null;
      if (action === 'restore_recording' && coverage && !coverage.partial) {
        const streams = inlineWorkoutStream(decoded.stream);
        const existingCoverage = summarizeRecordingCoverage(workout);
        if (streams && (!existingCoverage || existingCoverage.partial || !isUsableTelemetry(workout.streams, expectedDuration))) {
          const { avg_hr, max_hr } = decoded.summary;
          const load = resolveSessionLoad({
            stream: decoded.stream, durationSeconds: expectedDuration,
            avgHr: avg_hr || workout.avg_hr, restHr, maxHr, sex: athlete?.sex,
          });
          const measuredLoad = load.load_source === 'stream' && zones.coverage_pct >= 95
            ? { ...load, load_coverage_pct: zones.coverage_pct } : null;
          const patch = {
            streams,
            source_format: 'fit',
            zone_seconds: zones.zone_seconds,
            zone_method: zones.zone_method,
            zone_bounds_bpm: zones.zone_bounds_bpm,
            ...(avg_hr ? { avg_hr } : {}),
            ...(max_hr ? { max_hr } : {}),
            ...(decoded.laps.length ? { laps: decoded.laps.slice(0, 200) } : {}),
            ...measuredLoad,
          };
          // Use the caller's entity permissions for the write. Keep the workout
          // identity, date, device energy and plan link untouched.
          try {
            await base44.entities.WorkoutSession.update(workout.id, patch);
            restored_workout = {
              id: workout.id, source_format: 'fit',
              ...(avg_hr ? { avg_hr } : {}),
              ...(max_hr ? { max_hr } : {}),
              ...measuredLoad,
            };
            if (measuredLoad) {
              const loadResult = await recomputeCTLATLTSB(base44, workout.athlete_id).catch(() => null);
              training_load_refreshed = loadResult?.success === true;
            }
          } catch {
            console.warn('Verified COROS analysis available, inline recording could not be saved.');
          }
        }
      }
      return Response.json({ ...recording, restored_workout, training_load_refreshed, analysis: {
        coverage, ...zones,
        windows: {
          300: summarizeRecordingWindows(decoded.stream, 300),
          600: summarizeRecordingWindows(decoded.stream, 600),
        },
      } }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    return Response.json({ ...recording, streams: storageStream(decoded.stream) }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch {
    return Response.json({ error: 'The original COROS recording could not be verified or retrieved.' }, { status: 502 });
  }
}
