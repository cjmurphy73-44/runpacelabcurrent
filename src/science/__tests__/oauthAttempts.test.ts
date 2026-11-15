// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { issueOAuthAttempt, consumeOAuthAttempt } from '../../../base44/shared/oauthAttempts';

const athlete = { id: 'synthetic-athlete', created_by_id: 'synthetic-owner' };
const uri = 'https://synthetic.test/functions/corosSync';
const now = Date.parse('2026-11-15T09:00:00Z');
const input = { provider: 'coros', athlete, ownerUserId: athlete.created_by_id, redirectUri: uri, verifier: 'v'.repeat(43) };

function store() {
  const rows = new Map();
  let sequence = 0;
  const repo = {
    create: vi.fn(async (data) => { const row = { ...data, id: `attempt-${++sequence}` }; rows.set(row.id, row); return { id: row.id }; }),
    get: vi.fn(async (id) => { if (!rows.has(id)) throw new Error('Not found'); return { ...rows.get(id) }; }),
    // This synthetic adapter models exact, single-active-row consumption. It
    // does NOT establish the same property for the hosted Base44 API.
    deleteMany: vi.fn(async (query) => {
      const row = rows.get(query.id);
      const matched = row && Object.entries(query).every(([key, value]) => row[key] === value);
      if (matched) rows.delete(query.id);
      return { success: true, deleted: matched ? 1 : 0 };
    }),
  };
  const profile = vi.fn(async () => ({ ...athlete }));
  return { rows, repo, profile, client: { asServiceRole: { entities: { OAuthAttempt: repo, AthleteProfile: { get: profile } } } } };
}

describe('opaque OAuth attempt protocol', () => {
  it('keeps athlete ID and PKCE verifier out of state and persists only a nonce hash', async () => {
    const h = store();
    const { state, cookie } = await issueOAuthAttempt(h.client, input, now);
    expect(state).toMatch(/^attempt-1\.[A-Za-z0-9_-]{43}$/);
    expect(state).not.toContain(athlete.id);
    expect(state).not.toContain(input.verifier);
    expect(h.rows.get('attempt-1').nonce_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(h.rows.get('attempt-1'))).not.toContain(state.split('.')[1]);
    expect(await consumeOAuthAttempt(h.client, state, 'coros', uri, cookie, now + 1)).toMatchObject({ athleteId: athlete.id, ownerUserId: athlete.created_by_id, verifier: input.verifier });
  });
  it('allows only one consumer of competing synthetic callbacks and rejects later replay', async () => {
    const h = store();
    const { state, cookie } = await issueOAuthAttempt(h.client, input, now);
    const outcomes = await Promise.allSettled([
      consumeOAuthAttempt(h.client, state, 'coros', uri, cookie, now + 1),
      consumeOAuthAttempt(h.client, state, 'coros', uri, cookie, now + 1),
    ]);
    expect(outcomes.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter((r) => r.status === 'rejected')).toHaveLength(1);
    await expect(consumeOAuthAttempt(h.client, state, 'coros', uri, cookie, now + 2)).rejects.toThrow('security state');
  });
  it.each(['', 'athlete.verifier.signature', 'attempt-1.short', 'attempt-1.' + 'a'.repeat(43) + '.extra'])('rejects malformed or missing state before lookup: %s', async (state) => {
    const h = store(); const cookie = '';
    await expect(consumeOAuthAttempt(h.client, state, 'coros', uri, cookie, now)).rejects.toThrow('security state');
    expect(h.repo.get).not.toHaveBeenCalled();
  });
  it.each(['nonce', 'provider', 'redirect', 'expired', 'future', 'owner', 'athlete', 'verifier'])('fails closed on %s mismatch without consumption', async (kind) => {
    const h = store();
    const issued = await issueOAuthAttempt(h.client, input, now);
    let state = issued.state; const cookie = issued.cookie;
    let provider = 'coros'; let target = uri; let at = now + 1;
    if (kind === 'nonce') state = state.split('.')[0] + '.' + 'x'.repeat(43);
    if (kind === 'provider') provider = 'oura';
    if (kind === 'redirect') target = 'https://other.test/callback';
    if (kind === 'expired') at = now + 600000;
    if (kind === 'future') at = now - 1;
    if (kind === 'owner') h.profile.mockResolvedValue({ ...athlete, created_by_id: 'foreign-owner' });
    if (kind === 'athlete') h.profile.mockResolvedValue({ ...athlete, id: 'foreign-athlete' });
    if (kind === 'verifier') h.rows.get('attempt-1').pkce_verifier = '';
    await expect(consumeOAuthAttempt(h.client, state, provider, target, cookie, at)).rejects.toThrow('security state');
    expect(h.repo.deleteMany).not.toHaveBeenCalled();
  });
  it.each([undefined, { success: true }, { success: true, deleted: 0 }, { success: true, deleted: 2 }, { success: false, deleted: 1 }])('requires explicit one-row consumption confirmation', async (result) => {
    const h = store();
    const { state, cookie } = await issueOAuthAttempt(h.client, input, now);
    h.repo.deleteMany.mockResolvedValue(result as any);
    await expect(consumeOAuthAttempt(h.client, state, 'coros', uri, cookie, now + 1)).rejects.toThrow('security state');
  });
  it('refuses a self-linked foreign athlete before creating an attempt', async () => {
    const h = store();
    await expect(issueOAuthAttempt(h.client, { ...input, ownerUserId: 'foreign-user' }, now)).rejects.toThrow();
    expect(h.repo.create).not.toHaveBeenCalled();
  });
  it('rejects a different browser cookie even with the exact valid state', async () => {
    const h = store();
    const { state } = await issueOAuthAttempt(h.client, input, now);
    await expect(consumeOAuthAttempt(h.client, state, 'coros', uri, '__Host-tpl-oauth-attempt-1=' + 'x'.repeat(43), now + 1)).rejects.toThrow();
    expect(h.repo.deleteMany).not.toHaveBeenCalled();
  });
  it('fails closed on missing persisted bindings and unavailable state storage', async () => {
    const h = store();
    h.repo.get.mockResolvedValue({ id: 'attempt-1' });
    await expect(issueOAuthAttempt(h.client, input, now)).rejects.toThrow();
    h.repo.create.mockRejectedValue(new Error('unavailable'));
    await expect(issueOAuthAttempt(h.client, input, now)).rejects.toThrow();
  });
});
