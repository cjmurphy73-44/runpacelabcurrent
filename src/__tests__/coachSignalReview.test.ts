// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { coachSignalReview } from '../../base44/shared/coachSignalReview';
import { computeInjurySignal } from '../lib/coachInjurySignal';

const now = new Date('2026-11-08T12:00:00Z');
const msg = (text: string, date = '2026-11-07T12:00:00Z') => ({ id: text, content_text: text, created_date: date, message_type: 'athlete_reply' });
function setup(owner = 'owner') {
  let messages = [msg('No running this week.')];
  const reviews: any[] = [];
  const bulkCreate = vi.fn(async rows => { reviews.push(...rows); });
  const client = {
    entities: { AthleteProfile: { get: vi.fn(async () => ({ id: 'athlete', created_by_id: owner })) } },
    asServiceRole: { entities: {
      CoachMessage: { filter: vi.fn(async (_query?: unknown, _sort?: string, _limit?: number) => messages) },
      CoachSignalReview: { filter: vi.fn(async () => reviews), bulkCreate },
    } },
  };
  const read = () => coachSignalReview(client, { id: 'owner' }, { action: 'read', athlete_id: 'athlete' });
  const resolve = async revision => {
    const snapshot = await (await read()).json();
    return coachSignalReview(client, { id: 'owner' }, { action: 'resolve', athlete_id: 'athlete', revision, source_keys: snapshot.messages.map(m => m.review_key) });
  };
  return { client, reviews, bulkCreate, read, resolve, setMessages: value => { messages = value; } };
}

describe('conversation review persistence', () => {
  it('acknowledges exact source text across subsequent reads, without changing any plan', async () => {
    const f = setup();
    const snapshot = await (await f.read()).json();
    expect(snapshot.messages).toHaveLength(1);
    expect((await f.resolve(snapshot.revision)).status).toBe(200);
    expect((await (await f.read()).json()).messages).toHaveLength(0);
    expect(f.reviews[0]).toMatchObject({ athlete_id: 'athlete', owner_user_id: 'owner', resolution: 'not_current' });
    expect(f.reviews[0].source_key).toMatch(/^[a-f0-9]{64}$/);
    expect(f.reviews[0]).not.toHaveProperty('content_text');
  });
  it('does not resolve a newer snapshot through an older screen', async () => {
    const f = setup();
    const before = await (await f.read()).json();
    f.setMessages([msg('New knee pain.')]);
    expect((await f.resolve(before.revision)).status).toBe(409);
    expect(f.bulkCreate).not.toHaveBeenCalled();
  });
  it('edited message content remains reviewable and duplicate resolution is idempotent', async () => {
    const f = setup();
    const before = await (await f.read()).json();
    const payload = { action: 'resolve', athlete_id: 'athlete', revision: before.revision, source_keys: before.messages.map(m => m.review_key) };
    await coachSignalReview(f.client, { id: 'owner' }, payload);
    await coachSignalReview(f.client, { id: 'owner' }, payload);
    expect(f.bulkCreate).toHaveBeenCalledTimes(1);
    f.setMessages([{ ...msg('New pain'), id: 'No running this week.' }]);
    expect((await (await f.read()).json()).messages).toHaveLength(1);
  });
  it('rejects spoofed owner/coach links before any privileged read or write', async () => {
    const f = setup('different-user');
    const user = { id: 'owner', athlete_profile_id: 'athlete', coached_athletes: ['athlete'] };
    expect((await coachSignalReview(f.client, user, { action: 'resolve', athlete_id: 'athlete', revision: 'fake' })).status).toBe(403);
    expect(f.client.asServiceRole.entities.CoachMessage.filter).not.toHaveBeenCalled();
    expect(f.bulkCreate).not.toHaveBeenCalled();
  });
  it('rejects anonymous and malformed calls without profile reads', async () => {
    const f = setup();
    expect((await coachSignalReview(f.client, null, {})).status).toBe(401);
    expect((await coachSignalReview(f.client, { id: 'owner' }, { action: 'delete' })).status).toBe(400);
    expect(f.client.entities.AthleteProfile.get).not.toHaveBeenCalled();
  });
  it('includes recently edited guidance even behind more than 30 newer-created messages', async () => {
    const f = setup();
    const history = Array.from({ length: 31 }, (_, i) => ({ ...msg(`Session ${i}`), updated_date: '2026-11-07T12:00:00Z' }));
    const edited = { ...msg('New knee pain', '2026-10-01'), updated_date: '2026-11-08T10:00:00Z' };
    history.push(edited);
    f.client.asServiceRole.entities.CoachMessage.filter.mockImplementationOnce(async (_query, sort, limit) =>
      [...history].sort((a, b) => Date.parse(b[sort.slice(1)]) - Date.parse(a[sort.slice(1)])).slice(0, limit));
    const snapshot = await (await f.read()).json();
    expect(snapshot.messages[0].content_text).toBe('New knee pain');
    expect(computeInjurySignal(snapshot.messages, { now }).level).toBe('caution');
  });
  it('propagates write failure and never reports success', async () => {
    const f = setup();
    const snapshot = await (await f.read()).json();
    f.bulkCreate.mockRejectedValueOnce(new Error('offline'));
    await expect(f.resolve(snapshot.revision)).rejects.toThrow('offline');
  });
  it('acknowledges only selected displayed messages, never unseen or forged keys', async () => {
    const f = setup();
    f.setMessages([msg('Knee pain'), msg('Rest week')]);
    const snapshot = await (await f.read()).json();
    const body = { action: 'resolve', athlete_id: 'athlete', revision: snapshot.revision, source_keys: [snapshot.messages[0].review_key] };
    expect((await coachSignalReview(f.client, { id: 'owner' }, body)).status).toBe(200);
    const after = await (await f.read()).json();
    expect(after.messages.map(m => m.content_text)).toEqual(['Rest week']);
    expect((await coachSignalReview(f.client, { id: 'owner' }, { ...body, source_keys: ['forged'] })).status).toBe(400);
  });
});

describe('conversation signals never become automatic running restrictions', () => {
  it.each(['I am not injured and feel well.', 'Should I see a physio?', 'Cleared to resume running.'])('does not turn %s into a hold', text => {
    expect(computeInjurySignal([msg(text)], { now }).level).toBe('none');
  });
  it('keeps actionable evidence newest-first and says no plan change was saved', () => {
    const result = computeInjurySignal([msg('Rest week.', '2026-11-03T12:00:00Z'), msg('No running.')], { now });
    expect(result.level).toBe('caution');
    expect(result.evidence[0].date).toBe('2026-11-07T12:00:00.000Z');
    expect(result.holdReason).toBe(null);
    expect(result.summary).toContain('has not been changed');
  });
  it('ignores future/invalid timestamps and keeps older text non-authoritative', () => {
    expect(computeInjurySignal([msg('No running.', '2026-12-01'), msg('No running.', 'invalid')], { now }).level).toBe('none');
    expect(computeInjurySignal([msg('No running.', '2026-10-23')], { now }).level).toBe('none');
  });
  it('reviews recently edited older messages using the edit date', () => {
    const result = computeInjurySignal([{ ...msg('New knee pain.', '2026-10-01'), updated_date: '2026-11-08T10:00:00Z' }], { now });
    expect(result.level).toBe('caution');
    expect(result.evidence[0].date).toBe('2026-11-08T10:00:00.000Z');
  });
});
