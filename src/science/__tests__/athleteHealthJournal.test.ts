import { describe, expect, it, vi } from 'vitest';
import { handleAthleteHealthJournal, validateHealthJournalEntry } from '../../../base44/shared/athleteHealthJournal';

function request(payload: Record<string, unknown>) {
  return new Request('https://fixture.test/athleteHealthJournal', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
}
function fixture({ authenticated = true, owned = true, consented = false } = {}) {
  const profile = { id: 'athlete-1', created_by_id: owned ? 'owner-1' : 'different-owner' };
  const consents = {
    filter: vi.fn(async () => consented ? [{ id: 'consent-1', athlete_id: profile.id, enabled: true }] : []),
    upsert: vi.fn(async () => ({ created: 1, updated: 0 })),
    delete: vi.fn(async () => ({})),
  };
  const journal = {
    filter: vi.fn(async () => []),
    upsert: vi.fn(async () => ({ created: 1, updated: 0 })),
    delete: vi.fn(async () => ({})),
  };
  const base44 = {
    auth: { me: vi.fn(async () => authenticated ? { id: 'owner-1' } : null) },
    asServiceRole: {
      entities: {
        User: { get: vi.fn(async () => ({ id: 'owner-1', data: {} })) },
        AthleteProfile: { filter: vi.fn(async () => [profile]), get: vi.fn(async () => profile) },
        AthleteHealthConsent: consents,
        AthleteHealthJournal: journal,
      },
    },
  };
  return { base44, consents, journal };
}

describe('private athlete menstrual journal', () => {
  it('validates bounded self-reported entries without predicting a cycle phase', () => {
    expect(validateHealthJournalEntry({ date: '2026-01-20', period_started: true, flow: 'light', symptoms: ['cramps'] }))
      .toMatchObject({ flow: 'light', symptoms: ['cramps'] });
    expect(validateHealthJournalEntry({ date: '2026-02-30', flow: 'light' })).toBeNull();
    expect(validateHealthJournalEntry({ date: '2026-01-20', flow: 'ovulation' })).toBeNull();
    expect(validateHealthJournalEntry({ date: '2026-01-20', notes: 'x'.repeat(501) })).toBeNull();
    expect(validateHealthJournalEntry({ date: '2026-01-20', athlete_id: 'foreign', flow: 'light' })).toBeNull();
  });

  it('never touches storage when the feature is disabled', async () => {
    const { base44, consents } = fixture();
    const response = await handleAthleteHealthJournal(base44, request({ action: 'enable', acknowledged: true }), false);
    expect(response.status).toBe(503);
    expect(consents.upsert).not.toHaveBeenCalled();
  });

  it('denies anonymous and foreign athletes without any journal write', async () => {
    const anonymous = fixture({ authenticated: false });
    expect((await handleAthleteHealthJournal(anonymous.base44, request({ action: 'status' }), true)).status).toBe(401);
    expect(anonymous.consents.filter).not.toHaveBeenCalled();
    const foreign = fixture({ owned: false });
    expect((await handleAthleteHealthJournal(foreign.base44, request({ action: 'status' }), true)).status).toBe(404);
    expect(foreign.consents.filter).not.toHaveBeenCalled();
    expect(foreign.journal.upsert).not.toHaveBeenCalled();
  });

  it('requires explicit opt-in before writing sensitive data', async () => {
    const { base44, consents, journal } = fixture();
    expect((await handleAthleteHealthJournal(base44, request({ action: 'enable' }), true)).status).toBe(400);
    expect((await handleAthleteHealthJournal(base44, request({
      action: 'save', entry: { date: '2026-01-20', flow: 'light' },
    }), true)).status).toBe(403);
    expect(consents.upsert).not.toHaveBeenCalled();
    expect(journal.upsert).not.toHaveBeenCalled();
    expect((await handleAthleteHealthJournal(base44, request({ action: 'enable', acknowledged: true }), true)).status).toBe(200);
    expect(consents.upsert).toHaveBeenCalledWith([
      expect.objectContaining({ athlete_id: 'athlete-1', enabled: true, share_with_coach: false }),
    ], { key: ['athlete_id'] });
  });

  it('saves only owner-scoped, consented diary rows', async () => {
    const { base44, journal } = fixture({ consented: true });
    const result = await handleAthleteHealthJournal(base44, request({
      action: 'save', entry: { date: '2026-01-20', flow: 'light', symptoms: ['fatigue'] },
    }), true);
    expect(result.status).toBe(200);
    expect(journal.upsert).toHaveBeenCalledWith([
      expect.objectContaining({ athlete_id: 'athlete-1', date: '2026-01-20', flow: 'light' }),
    ], { key: ['athlete_id', 'date'] });
  });

  it('exports only owner-scoped entries with a complete flag and no shared access', async () => {
    const { base44, journal } = fixture({ consented: true });
    journal.filter.mockResolvedValueOnce([
      { athlete_id: 'athlete-1', date: '2026-01-20', flow: 'light', notes: 'private' },
    ] as any);
    const response = await handleAthleteHealthJournal(base44, request({ action: 'export' }), true);
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    const body = await response.json();
    expect(body).toMatchObject({
      complete: true, coach_access: false, ai_access: false,
      entries: [{ date: '2026-01-20', notes: 'private' }],
    });
    expect(journal.filter).toHaveBeenCalledWith({ athlete_id: 'athlete-1' }, '-date', 100, 0);
  });

  it('refuses foreign journal rows instead of silently filtering private data', async () => {
    const { base44, journal } = fixture({ consented: true });
    journal.filter.mockResolvedValueOnce([
      { athlete_id: 'athlete-2', date: '2026-01-20', notes: 'not yours' },
    ] as any);
    const response = await handleAthleteHealthJournal(base44, request({ action: 'export' }), true);
    expect(response.status).toBe(503);
    expect(journal.upsert).not.toHaveBeenCalled();
    const body = await response.json();
    expect(JSON.stringify(body)).not.toContain('not yours');
  });

  it('refuses duplicate or foreign consent state rather than granting access', async () => {
    const { base44, consents, journal } = fixture();
    consents.filter.mockResolvedValueOnce([
      { athlete_id: 'athlete-1', enabled: true },
      { athlete_id: 'athlete-1', enabled: true },
    ] as any);
    const response = await handleAthleteHealthJournal(base44, request({ action: 'save',
      entry: { date: '2026-01-20', flow: 'light' } }), true);
    expect(response.status).toBe(503);
    expect(journal.upsert).not.toHaveBeenCalled();
  });

  it('never exports sensitive rows before explicit consent', async () => {
    const { base44, journal } = fixture();
    const result = await handleAthleteHealthJournal(base44, request({ action: 'export' }), true);
    expect(result.status).toBe(403);
    expect(journal.filter).not.toHaveBeenCalled();
  });

  it('erases owned entries before deleting the consent record', async () => {
    const { base44, journal, consents } = fixture({ consented: true });
    journal.filter.mockResolvedValueOnce([
      { id: 'entry-a', athlete_id: 'athlete-1', date: '2026-01-20' },
    ] as any);
    const result = await handleAthleteHealthJournal(base44,
      request({ action: 'erase_all', confirm: 'DELETE' }), true);
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({ enabled: false, erased: true });
    expect(journal.delete).toHaveBeenCalledWith('entry-a');
    expect(consents.delete).toHaveBeenCalledWith('consent-1');
  });

  it('never allows silent deletion without explicit confirmation', async () => {
    const { base44, journal, consents } = fixture({ consented: true });
    expect((await handleAthleteHealthJournal(base44, request({ action: 'erase_all' }), true)).status).toBe(400);
    expect(journal.delete).not.toHaveBeenCalled();
    expect(consents.delete).not.toHaveBeenCalled();
  });
});
