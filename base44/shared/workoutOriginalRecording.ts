import { isCompleteCorosFit } from './corosRecordingArchive.ts';
import { readPrivateRecording, savePrivateRecording, hashRecording, recordingStorageError, MAX_PRIVATE_RECORDING_BYTES } from './privateRecordingArchive.ts';
import { parseFitWithLaps, parseTcx } from './workoutParsers.ts';
import { isRecordId } from './ownership.ts';
import { claimRateLimit } from './rateLimit.ts';
import { inlineWorkoutStream, isUsableTelemetry } from './streamValidity.ts';
import { summarizeRecordingCoverage } from './recordingWindows.js';
import { measureWorkoutRecording, recordingAnalysis, recordingDuration } from './workoutRecordingMeasurements.ts';
import { recomputeCTLATLTSB } from './ctlRecalc.ts';

const MAX_SAMPLES = 28800;
const MAX_UPLOAD_REQUEST_BYTES = MAX_PRIVATE_RECORDING_BYTES + 8192;
const MAX_START_DIFFERENCE_MS = 2 * 60_000;
const CANDIDATE_FIELDS = ['id', 'date', 'sport', 'recording_started_at', 'duration_minutes', 'duration_seconds', 'distance_km'];
const savesInProgress = new Set<string>();
const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store' };

function json(data, status = 200) {
  return Response.json(data, { status, headers: PRIVATE_HEADERS });
}

function error(message: string, status: number) {
  return json({ error: message }, status);
}

function formatOf(bytes: Uint8Array) {
  if (isCompleteCorosFit(bytes)) return 'fit';
  return /<TrainingCenterDatabase\b/.test(new TextDecoder().decode(bytes.subarray(0, 2048))) ? 'tcx' : null;
}

function validFormat(bytes: Uint8Array) {
  return formatOf(bytes) !== null;
}

function decodeWorkout(bytes: Uint8Array) {
  const format = formatOf(bytes);
  if (!format) return null;
  try {
    const decoded = format === 'fit' ? parseFitWithLaps(bytes) : parseTcx(new TextDecoder().decode(bytes));
    if (!decoded || decoded.identity.activityCount > 1 || decoded.stream.length > MAX_SAMPLES) return null;
    return { ...decoded, format };
  } catch {
    return null;
  }
}

function matches(workout, decoded) {
  const duration = recordingDuration(workout);
  const summary = decoded.summary;
  if (!(duration >= 60) || Math.abs(duration - summary.duration_seconds) > Math.max(10, duration * 0.06)) return false;
  if (decoded.identity.sport && workout.sport !== decoded.identity.sport && workout.sport !== 'other') return false;
  const started = Date.parse(workout.recording_started_at);
  const originalStart = Date.parse(summary.recording_started_at);
  if (!Number.isFinite(originalStart)) return false;
  if (Number.isFinite(started)) {
    if (Math.abs(started - originalStart) > MAX_START_DIFFERENCE_MS) return false;
  } else if (workout.date !== summary.derived_date) {
    return false;
  }
  const recordedDistance = Number(workout.distance_km) || 0;
  if (recordedDistance > 0 && summary.distance_km > 0) {
    return Math.abs(summary.distance_km - recordedDistance) <= Math.max(0.12, recordedDistance * 0.05);
  }
  // For indoor or stationary activities whose summary lacks distance, require
  // a recorded start or a known sport as additional evidence.
  return Number.isFinite(started) || Boolean(decoded.identity.sport && workout.sport === decoded.identity.sport);
}

async function readInput(req: Request, upload: boolean) {
  const limit = upload ? MAX_UPLOAD_REQUEST_BYTES : 1024;
  if (Number(req.headers.get('Content-Length')) > limit) return { failure: 413 };
  const reader = req.body?.getReader();
  if (!reader) return { failure: 400 };
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    total += next.value.length;
    if (total > limit) {
      await reader.cancel().catch(() => {});
      return { failure: 413 };
    }
    chunks.push(next.value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const body = new Response(bytes, { headers: { 'Content-Type': req.headers.get('Content-Type') || 'application/json' } });
  if (!upload) return await body.json().catch(() => ({ failure: 400 }));
  const form = await body.formData().catch(() => null);
  return form ? { action: form.get('action'), workout_id: form.get('workout_id'), file: form.get('file') } : { failure: 400 };
}

function base64(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 24 * 1024) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 24 * 1024));
  }
  return btoa(binary);
}

export async function handleWorkoutOriginalRecording(base44, req: Request) {
  if (req.method !== 'POST') return error('Method not allowed', 405);
  const user = await base44.auth.me().catch(() => null);
  if (!user?.id) return error('Unauthorized', 401);
  const upload = req.headers.get('Content-Type')?.toLowerCase().startsWith('multipart/form-data') === true;
  if (!claimRateLimit(`original-recording:${user.id}:${upload}`, upload ? 5 : 30, 60_000)) {
    return error('Too many recording requests. Try again in a minute.', 429);
  }
  const input = await readInput(req, upload).catch(() => ({ failure: 400 }));
  if (input?.failure === 413) return error('Original recordings must be 2 MiB or smaller.', 413);
  if (!isRecordId(input?.workout_id) || (upload ? input.action !== 'save' : !['read', 'download'].includes(input.action))) {
    return error('A workout and a valid recording action are required.', 400);
  }

  const entities = base44.asServiceRole.entities;
  const workout = await base44.entities.WorkoutSession.get(input.workout_id).catch(() => null);
  const athlete = workout && await entities.AthleteProfile.get(workout.athlete_id).catch(() => null);
  if (!athlete || athlete.created_by_id !== user.id) return error('Workout not found', 404);
  const archive = entities.WorkoutOriginalRecording;
  const scope = { athlete_id: workout.athlete_id, session_id: workout.id };
  try {
    if (upload) {
      const key = workout.id;
      if (savesInProgress.has(key)) return error('A recording is already being attached. Try again shortly.', 409);
      savesInProgress.add(key);
      try {
        return await attachRecording(base44, archive, scope, athlete, workout, input.file);
      } finally {
        savesInProgress.delete(key);
      }
    }
    if (!workout.original_recording_sha256) return json({ status: 'unavailable' });
    const bytes = await readPrivateRecording(archive, scope, validFormat, false, workout.original_recording_sha256);
    if (!bytes) return error('The saved original did not pass verification.', 502);
    const sha256 = await hashRecording(bytes);
    if (input.action === 'download') {
      return json({ format: formatOf(bytes), sha256, file_b64: base64(bytes) });
    }
    const decoded = decodeWorkout(bytes);
    if (!decoded) return error('Could not analyze the saved original recording.', 422);
    const { coverage, zones } = measureWorkoutRecording(workout, athlete, decoded);
    return json({ status: 'verified', format: decoded.format, sha256, analysis: recordingAnalysis(decoded, coverage, zones) });
  } catch (failure) {
    console.warn('Workout original recording operation failed.', { action: input.action, ...recordingStorageError(failure) });
    return error('The original recording could not be saved or verified. Try again.', 502);
  }
}

async function attachRecording(base44, archive, scope, athlete, workout, file) {
  if (!(file instanceof File) || !/\.(fit|tcx)$/i.test(file.name) || !file.size) {
    return error('Choose the original FIT or TCX file.', 400);
  }
  if (file.size > MAX_PRIVATE_RECORDING_BYTES) return error('Original recordings must be 2 MiB or smaller.', 413);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const decoded = decodeWorkout(bytes);
  if (!decoded || !file.name.toLowerCase().endsWith(`.${decoded.format}`)) {
    return error('This file could not be read as one supported FIT or TCX activity.', 422);
  }
  const duration = recordingDuration(workout);
  const sha256 = await hashRecording(bytes);
  const workoutStore = base44.asServiceRole.entities.WorkoutSession;
  const saved = await readPrivateRecording(archive, scope, validFormat, false, workout.original_recording_sha256);
  if (saved && await hashRecording(saved) !== sha256) return error('This workout already has a different original attached.', 409);
  if (!saved && workout.original_recording_sha256) return error('The saved original did not pass verification.', 502);
  if (!saved) {
    if (!matches(workout, decoded)) return error('The recording date, start time, sport, distance or duration does not match this workout.', 422);
    const coverage = summarizeRecordingCoverage({ ...workout, streams: decoded.stream });
    if (!coverage || coverage.partial || !isUsableTelemetry(decoded.stream, duration)) {
      return error('This file does not contain enough heart-rate or power samples across this workout.', 422);
    }
    if (isUsableTelemetry(workout.streams, duration) && summarizeRecordingCoverage(workout)?.partial === false) {
      return error('This workout already has a complete recording.', 409);
    }
    const candidates = await workoutStore.filter({
      athlete_id: workout.athlete_id,
      date: { $in: [...new Set([workout.date, decoded.summary.derived_date])] },
    }, 'id', 100, 0, CANDIDATE_FIELDS);
    const start = Date.parse(workout.recording_started_at);
    if (candidates.length === 100 || candidates.some(candidate =>
      candidate.id !== workout.id &&
      (!Number.isFinite(start) || Number.isFinite(Date.parse(candidate.recording_started_at))) &&
      matches(candidate, decoded)
    )) {
      return error('This recording also matches another workout. Keep the original until the sessions can be distinguished.', 409);
    }
    await savePrivateRecording(archive, scope, athlete.created_by_id, bytes, validFormat);
  }

  // If an archive write succeeded before the workout update timed out, a retry
  // resumes the same bytes. The first verified original wins across workers.
  const current = await workoutStore.get(workout.id).catch((error) => {
    if ((error?.response?.status ?? error?.status) === 404) return null;
    throw error;
  });
  if (!current) {
    await archive.deleteMany({ ...scope, owner_user_id: athlete.created_by_id });
    return error('Workout not found', 404);
  }
  if (current.athlete_id !== workout.athlete_id || (current.original_recording_sha256 && current.original_recording_sha256 !== sha256)) {
    return error('This workout changed while the file was being attached. Reload it and try again.', 409);
  }
  if (!current.original_recording_sha256) {
    if (!matches(current, decoded)) return error('This workout changed while the file was being attached.', 409);
    const canonical = await readPrivateRecording(archive, scope, validFormat, false);
    if (!canonical || await hashRecording(canonical) !== sha256) return error('A different original is already attached.', 409);
  }

  const { coverage, zones, measuredLoad } = measureWorkoutRecording(current, athlete, decoded);
  const { avg_hr, max_hr, avg_power, avg_cadence } = decoded.summary;
  const projection = {
    id: current.id, source_format: decoded.format, original_recording_sha256: sha256,
    ...(avg_hr ? { avg_hr } : {}),
    ...(max_hr ? { max_hr } : {}),
    ...(avg_power > 0 && avg_power <= 2500 ? { avg_power } : {}),
    ...(avg_cadence > 0 && avg_cadence <= 300 ? { avg_cadence } : {}),
    ...(decoded.laps.length ? { laps: decoded.laps.filter(lap => lap.duration_s != null).slice(0, 200) } : {}),
    zone_seconds: zones.zone_seconds, zone_method: zones.zone_method, zone_bounds_bpm: zones.zone_bounds_bpm,
    ...measuredLoad,
  };
  if (!current.original_recording_sha256) {
    const { id: _id, ...patch } = projection;
    const streams = inlineWorkoutStream(decoded.stream);
    await workoutStore.update(current.id, {
      ...patch,
      recording_started_at: current.recording_started_at || decoded.summary.recording_started_at,
      streams: streams ?? [],
    });
  }
  const loadResult = measuredLoad
    ? await recomputeCTLATLTSB(base44, workout.athlete_id).catch(() => null)
    : null;
  return json({
    status: 'verified', format: decoded.format, sha256, workout: projection,
    training_load_refreshed: measuredLoad ? loadResult?.success === true : null,
    analysis: recordingAnalysis(decoded, coverage, zones),
  });
}
