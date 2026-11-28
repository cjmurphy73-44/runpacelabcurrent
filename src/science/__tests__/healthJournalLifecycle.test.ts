import { describe, expect, it, vi } from 'vitest';
import { handleAthleteHealthJournal } from '../../../base44/shared/athleteHealthJournal';

// Stateful in-memory entity boundary: exercises actual HTTP handler through
// consent -> save -> overwrite -> list -> export -> delete -> erase, including
// two distinct simulated owners. No live athlete data or Base44 calls.
function memoryEnvironment() {
  const consentRows: any[] = [];
  const diaryRows: any[] = [];
  const calls = { healthWrites: 0, crossOwnerReads: 0 };
  const consent = {
    filter: vi.fn(async (q: any, _sort: string, limit = 100, offset = 0) =>
      consentRows.filter(r => r.athlete_id === q.athlete_id).slice(offset, offset + limit)),
    upsert: vi.fn(async (rows: any[]) => {
      for (const row of rows) {
        const index = consentRows.findIndex(x => x.athlete_id === row.athlete_id);
        if (index < 0) consentRows.push({ ...row, id: 'consent-' + row.athlete_id });
        else consentRows[index] = { ...consentRows[index], ...row };
      }
      return { created: rows.length, updated: 0 };
    }),
    delete: vi.fn(async (id: string) => {
      const i = consentRows.findIndex(r => r.id === id);
      if (i >= 0) consentRows.splice(i, 1);
    }),
  };
  const diary = {
    filter: vi.fn(async (q: any, _sort: string, limit = 100, offset = 0) => {
      if (Object.keys(q).some(k => !['athlete_id', 'date'].includes(k))) throw new Error('Unexpected query');
      const rows = diaryRows.filter(r => r.athlete_id === q.athlete_id &&
        (!q.date || r.date === q.date));
      calls.crossOwnerReads += rows.filter(x => x.athlete_id !== q.athlete_id).length;
      return rows.slice(offset, offset + limit);
    }),
    upsert: vi.fn(async (rows: any[]) => {
      for (const row of rows) {
        const i = diaryRows.findIndex(r => r.athlete_id === row.athlete_id && r.date === row.date);
        if (i < 0) diaryRows.push({ ...row, id: 'entry-' + row.athlete_id + '-' + row.date });
        else diaryRows[i] = { ...diaryRows[i], ...row };
        calls.healthWrites++;
      }
      return { created: rows.length, updated: 0 };
    }),
    delete: vi.fn(async (id: string) => {
      const i = diaryRows.findIndex(r => r.id === id);
      if (i >= 0) diaryRows.splice(i, 1);
    }),
  };
  const client = (id: string | null) => ({
    auth: { me: async () => id ? { id } : null },
    asServiceRole: { entities: {
      User: { get: async () => ({ id, data: {} }) },
      AthleteProfile: {
        filter: async (q: any) => id && q.created_by_id === id
          ? [{ id: 'athlete-' + id, created_by_id: id }] : [],
        get: async (profileId: string) => ({
          id: profileId, created_by_id: id === 'user-b' ? 'user-b' : 'user-a',
        }),
      },
      AthleteHealthConsent: consent, AthleteHealthJournal: diary,
    } },
  });
  const request = (body: any) => new Request('https://fixture.test/journal', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const send = async (id: string | null, body: any, enabled = true) =>
    handleAthleteHealthJournal(client(id), request(body), enabled);
  return { send, consentRows, diaryRows, consent, diary, calls };
}

describe('private journal stateful HTTP lifecycle', () => {
  it('requires consent, saves and updates by day, exports and deletes owned entries only', async () => {
    const e = memoryEnvironment();
    expect((await e.send('user-a', { action: 'status' })).status).toBe(200);
    expect((await e.send('user-a', { action: 'save', entry: {
      date: '2026-01-20', flow: 'light',
    } })).status).toBe(403);
    expect(e.diaryRows).toHaveLength(0);
    expect((await e.send('user-a', { action: 'enable', acknowledged: true })).status).toBe(200);
    expect((await e.send('user-a', { action: 'save', entry: {
      date: '2026-01-20', flow: 'light', notes: 'private',
    } })).status).toBe(200);
    expect((await e.send('user-a', { action: 'save', entry: {
      date: '2026-01-20', flow: 'medium', notes: 'updated',
    } })).status).toBe(200);
    expect(e.diaryRows).toHaveLength(1);
    const exported = await e.send('user-a', { action: 'export' });
    expect(exported.headers.get('Cache-Control')).toBe('private, no-store');
    expect(await exported.json()).toMatchObject({ complete: true,
      coach_access: false, ai_access: false,
      entries: [{ date: '2026-01-20', flow: 'medium', notes: 'updated' }],
    });
    // Second simulated athlete cannot read the first athlete's journal.
    expect((await e.send('user-b', { action: 'list' })).status).toBe(403);
    expect(e.calls.crossOwnerReads).toBe(0);
    expect((await e.send('user-a', { action: 'delete_day', date: '2026-01-20' })).status).toBe(200);
    expect(e.diaryRows).toHaveLength(0);
    expect((await e.send('user-a', { action: 'erase_all', confirm: 'DELETE' })).status).toBe(200);
    expect(e.consentRows).toHaveLength(0);
    expect(await (await e.send('user-a', { action: 'status' })).json()).toMatchObject({ enabled: false });
    expect(e.calls.healthWrites).toBe(2);
  });

  it('never writes when disabled, unauthenticated, foreign or unconsented', async () => {
    const e = memoryEnvironment();
    for (const [id, enabled] of [[null, true], ['user-a', false], ['user-b', true]] as const) {
      const response = await e.send(id, { action: 'save',
        entry: { date: '2026-01-20', period_started: true } }, enabled);
      expect([401, 403, 503]).toContain(response.status);
    }
    expect(e.calls.healthWrites).toBe(0);
    expect(e.diaryRows).toHaveLength(0);
    expect(e.consentRows).toHaveLength(0);
  });

  it('does not erase consent if a journal deletion fails', async () => {
    const e = memoryEnvironment();
    await e.send('user-a', { action: 'enable', acknowledged: true });
    await e.send('user-a', { action: 'save',
      entry: { date: '2026-01-20', flow: 'light' } });
    e.diary.delete.mockRejectedValueOnce(new Error('Storage is unavailable'));
    const response = await e.send('user-a', { action: 'erase_all', confirm: 'DELETE' });
    expect(response.status).toBe(503);
    expect(e.consentRows).toHaveLength(1);
  });
});
