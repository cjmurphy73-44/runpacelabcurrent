// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { handleWorkoutOriginalRecording } from '../../../base44/shared/workoutOriginalRecording';
import { recomputeCTLATLTSB } from '../../../base44/shared/ctlRecalc';

vi.mock('../../../base44/shared/ctlRecalc', () => ({ recomputeCTLATLTSB: vi.fn(async () => ({ success: true })) }));

const start = Date.parse('2026-10-17T10:00:00Z');
const workoutId = 'run-17';

function originalFit(seconds = 4200, startMs = start) {
  const definition = [0x40, 0, 0, 20, 0, 3, 253, 4, 0x86, 3, 1, 0x02, 5, 4, 0x86];
  const bytes = new Uint8Array(14 + definition.length + (seconds + 1) * 10 + 2);
  const view = new DataView(bytes.buffer);
  bytes[0] = 14;
  bytes.set([46, 70, 73, 84], 8);
  view.setUint32(4, bytes.length - 16, true);
  bytes.set(definition, 14);
  for (let i = 0; i <= seconds; i++) {
    const offset = 14 + definition.length + i * 10;
    view.setUint32(offset + 1, startMs / 1000 - 631065600 + i, true);
    bytes[offset + 5] = i === seconds ? 166 : 146;
    view.setUint32(offset + 6, i * 350, true);
  }
  return bytes;
}

function fixture(seconds = 4200) {
  const owner = { id: crypto.randomUUID() };
  const athlete = { id: 'athlete-a', created_by_id: owner.id, resting_hr: 55, max_heart_rate: 190 };
  let workout: Record<string, any> = {
    id: workoutId, athlete_id: athlete.id, date: '2026-10-17', sport: 'running',
    source_provider: 'coros', provider_activity_id: '100:3245',
    training_plan_session_id: 'prescribed-run', active_calories: 390, calories_source: 'device',
    duration_seconds: seconds, duration_minutes: seconds / 60, distance_km: Math.round(seconds * 0.35) / 100,
    avg_hr: 140, load_source: 'summary',
  };
  const rows: Record<string, any>[] = [];
  const candidates = () => [workout];
  const workoutStore = {
    get: vi.fn(async () => workout),
    filter: vi.fn(candidates),
    update: vi.fn(async (_id, patch) => (workout = { ...workout, ...patch })),
  };
  const archive = {
    async filter(query, sort, limit) {
      const matches = rows.filter(row => Object.entries(query).every(([key, value]) => row[key] === value));
      if (sort === 'part_index') matches.sort((a, b) => a.part_index - b.part_index);
      return matches.slice(0, limit);
    },
    bulkCreate: vi.fn(async parts => { rows.push(...parts); }),
    create: vi.fn(async manifest => { rows.push(manifest); }),
    deleteMany: vi.fn(async () => {}),
  };
  const client = (user: typeof owner | null = owner) => ({
    auth: { me: async () => user },
    entities: { WorkoutSession: workoutStore },
    asServiceRole: { entities: { AthleteProfile: { get: async () => athlete }, WorkoutSession: workoutStore, WorkoutOriginalRecording: archive } },
  });
  return { client, workoutStore, archive, rows };
}

function saveRequest(bytes = originalFit()) {
  const data = new FormData();
  data.append('workout_id', workoutId);
  data.append('action', 'save');
  data.append('file', new Blob([bytes]), 'original.fit');
  return new Request('https://app.test', { method: 'POST', body: data });
}

function request(action: 'read' | 'download') {
  return new Request('https://app.test', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, workout_id: workoutId }),
  });
}

describe('attaching an original recording to a saved workout', () => {
  it('keeps the session and plan, refreshes load and reads all samples of an oversized inline recording', async () => {
    const { client, workoutStore, archive, rows } = fixture();
    const fit = originalFit();
    const response = await handleWorkoutOriginalRecording(client(), saveRequest(fit));
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result).toMatchObject({
      status: 'verified', training_load_refreshed: true,
      workout: { id: workoutId, load_source: 'stream', max_hr: 166 },
      analysis: { coverage: { sampleCount: 4201, percent: 100 } },
    });
    expect(result.analysis.windows[600].at(-1)).toMatchObject({ startSeconds: 3600, durationSeconds: 600 });
    expect(await workoutStore.get()).toMatchObject({
      id: workoutId, source_provider: 'coros', provider_activity_id: '100:3245', active_calories: 390,
      training_plan_session_id: 'prescribed-run', streams: [],
      original_recording_sha256: result.sha256, recording_started_at: new Date(start).toISOString(),
    });
    expect(recomputeCTLATLTSB).toHaveBeenCalled();
    expect(rows.filter(row => row.kind === 'part')).toHaveLength(4);
    const read = await handleWorkoutOriginalRecording(client(), request('read'));
    expect(read.headers.get('cache-control')).toBe('private, no-store');
    expect(await read.json()).toMatchObject({ sha256: result.sha256, analysis: { coverage: { sampleCount: 4201 } } });
    const download = await handleWorkoutOriginalRecording(client(), request('download'));
    const raw = await download.json();
    expect(raw.sha256).toBe(result.sha256);
    expect(Buffer.from(raw.file_b64, 'base64')).toEqual(Buffer.from(fit));
    expect((await handleWorkoutOriginalRecording(client(), saveRequest(fit))).status).toBe(200);
    expect(archive.create).toHaveBeenCalledTimes(1);
    expect(workoutStore.update).toHaveBeenCalledTimes(1);
  });

  it('rejects a different day and ambiguous same-day workouts before archiving', async () => {
    const { client, workoutStore, archive } = fixture(180);
    const wrongDate = await handleWorkoutOriginalRecording(client(), saveRequest(originalFit(180, start - 86400000)));
    expect(wrongDate.status).toBe(422);
    workoutStore.filter.mockReturnValue([await workoutStore.get(), { ...await workoutStore.get(), id: 'second-workout' }]);
    const ambiguous = await handleWorkoutOriginalRecording(client(), saveRequest(originalFit(180)));
    expect(ambiguous.status).toBe(409);
    expect(archive.create).not.toHaveBeenCalled();
    expect(workoutStore.update).not.toHaveBeenCalled();
  });

  it('denies anonymous requests and another athlete before reading or changing the archive', async () => {
    const { client, workoutStore, archive } = fixture(180);
    const stranger = client({ id: crypto.randomUUID() });
    expect((await handleWorkoutOriginalRecording(client(null), request('read'))).status).toBe(401);
    expect((await handleWorkoutOriginalRecording(stranger, request('download'))).status).toBe(404);
    expect((await handleWorkoutOriginalRecording(stranger, saveRequest(originalFit(180)))).status).toBe(404);
    expect(archive.create).not.toHaveBeenCalled();
    expect(workoutStore.update).not.toHaveBeenCalled();
  });

  it('resumes a verified archive after a failed workout update and refuses corrupted readback', async () => {
    const { client, workoutStore, archive, rows } = fixture(180);
    workoutStore.update.mockRejectedValueOnce(new Error('temporary update failure'));
    expect((await handleWorkoutOriginalRecording(client(), saveRequest(originalFit(180)))).status).toBe(502);
    expect((await handleWorkoutOriginalRecording(client(), saveRequest(originalFit(180)))).status).toBe(200);
    expect(archive.create).toHaveBeenCalledTimes(1);
    expect((await workoutStore.get()).streams).toHaveLength(181);
    const raw = rows.find(row => row.kind === 'part')!;
    raw.data_b64 = raw.data_b64.slice(0, -10) + 'AAAAAAAAAA';
    expect((await handleWorkoutOriginalRecording(client(), request('download'))).status).toBe(502);
  });
});
