import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleCorosRecording } from '../../../base44/shared/corosRecordingHandler';
import { retrieveOriginalCorosFit } from '../../../base44/shared/corosOriginalFit';
import { recomputeCTLATLTSB } from '../../../base44/shared/ctlRecalc';

vi.mock('../../../base44/shared/corosOriginalFit', () => ({ retrieveOriginalCorosFit: vi.fn() }));
vi.mock('../../../base44/shared/corosMcp', () => ({ corosAccessToken: vi.fn(async () => 'authorized-token') }));
vi.mock('../../../base44/shared/ctlRecalc', () => ({ recomputeCTLATLTSB: vi.fn(async () => ({ success: true })) }));
vi.mock('../../../base44/shared/oauth', () => ({ env: () => undefined }));

function sampledFit(seconds: number) {
  const recordDefinition = [0x40, 0, 0, 20, 0, 2, 253, 4, 0x86, 3, 1, 0x02];
  const count = seconds + 1;
  const bytes = new Uint8Array(14 + recordDefinition.length + count * 6 + 2);
  const view = new DataView(bytes.buffer);
  bytes[0] = 14;
  bytes.set([46, 70, 73, 84], 8);
  view.setUint32(4, bytes.length - 16, true);
  bytes.set(recordDefinition, 14);
  for (let i = 0; i < count; i++) {
    const offset = 14 + recordDefinition.length + i * 6;
    view.setUint32(offset + 1, 100_000 + i, true);
    bytes[offset + 5] = i === count - 1 ? 173 : 145;
  }
  return bytes;
}

function app({ duration = 480, userId = 'owner', activityId = '100:1234' } = {}) {
  const workout = {
    id: 'workout', athlete_id: 'athlete', duration_seconds: duration, date: '2026-11-07',
    source_provider: 'coros', provider_activity_id: activityId, training_plan_session_id: 'prescribed',
  };
  const athlete = { id: 'athlete', created_by_id: 'owner', max_heart_rate: 195, resting_hr: 54 };
  const WorkoutSession = { get: vi.fn(async () => workout), update: vi.fn(async (_id: string, _patch: Record<string, unknown>) => workout) };
  const archive = { filter: vi.fn(async () => []), bulkCreate: vi.fn(), create: vi.fn() };
  return {
    auth: { me: vi.fn(async () => userId ? { id: userId } : null) },
    entities: { WorkoutSession, AthleteProfile: { get: vi.fn(async () => athlete) } },
    asServiceRole: { entities: {
      CorosRecordingArchive: archive,
      CorosConnection: { filter: vi.fn(async () => [{ status: 'connected', access_token: 'token' }]) },
      AthleteProfile: { get: vi.fn(async () => athlete) },
    } },
  };
}

describe('COROS exact original recording handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('restores a short exact recording in place, refreshing load without archiving the FIT', async () => {
    const client = app();
    vi.mocked(retrieveOriginalCorosFit).mockResolvedValue(sampledFit(480));
    const response = await handleCorosRecording(client, 'workout', 'restore_recording', true);
    const result = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(retrieveOriginalCorosFit).toHaveBeenCalledWith('authorized-token', '1234', '100', 480, 28800);
    expect(result).toMatchObject({
      source: 'provider', sample_count: 481, training_load_refreshed: true,
      restored_workout: { id: 'workout', max_hr: 173, load_source: 'stream' },
      analysis: { coverage: { percent: 100 }, zone_method: 'stream' },
    });
    expect(result.restored_workout).not.toHaveProperty('streams');
    expect(result).not.toHaveProperty('streams');
    const [id, patch] = client.entities.WorkoutSession.update.mock.calls[0];
    expect(id).toBe('workout');
    expect(patch.streams).toHaveLength(481);
    expect(patch).not.toHaveProperty('training_plan_session_id');
    expect(recomputeCTLATLTSB).toHaveBeenCalledWith(client, 'athlete');
    expect(client.asServiceRole.entities.CorosRecordingArchive.bulkCreate).not.toHaveBeenCalled();
  });

  it('analyzes the final samples of a long original without saving a truncated workout', async () => {
    const client = app({ duration: 5040 });
    vi.mocked(retrieveOriginalCorosFit).mockResolvedValue(sampledFit(5040));
    const response = await handleCorosRecording(client, 'workout', 'restore_recording');
    const result = await response.json();
    expect(result).toMatchObject({ sample_count: 5041, restored_workout: null, analysis: { coverage: { percent: 100 } } });
    expect(result.analysis.windows[600].at(-1)).toMatchObject({ startSeconds: 4800, durationSeconds: 240, hrCoverage: 1 });
    expect(client.entities.WorkoutSession.update).not.toHaveBeenCalled();
    expect(recomputeCTLATLTSB).not.toHaveBeenCalled();
  });

  it('rejects unrelated or anonymous callers, uncertain identity, and gated archive writes before talking to COROS', async () => {
    expect((await handleCorosRecording(app({ userId: '' }), 'workout', 'restore_recording')).status).toBe(401);
    expect((await handleCorosRecording(app({ userId: 'unrelated' }), 'workout', 'restore_recording')).status).toBe(404);
    expect((await handleCorosRecording(app({ activityId: '' }), 'workout', 'restore_recording')).status).toBe(422);
    expect((await handleCorosRecording(app(), 'workout', 'recover_recording')).status).toBe(503);
    expect(retrieveOriginalCorosFit).not.toHaveBeenCalled();
  });
});
