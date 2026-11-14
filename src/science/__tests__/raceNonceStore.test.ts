import { describe, expect, it } from 'vitest';
import { consumeRaceAuthNonce } from '../../../infra/race-d1/nonceStore';

function fakeDb() {
  const consumed = new Set();
  return {
    prepare() {
      return { bind(issuer, env, nonce) {
        return { async run() {
          const key = [issuer, env, nonce].join('|');
          if (consumed.has(key)) throw new Error('UNIQUE constraint failed');
          consumed.add(key);
          return { success: true };
        } };
      } };
    },
  };
}
const claim = { issuer: 'tpl-staging', environment: 'staging', nonce: 'nonce-123456789012345',
  expiresAt: 1060, nowSeconds: 1000 };
describe('Worker nonce store (mock)', () => {
  it('accepts first consumption and rejects a replay', async () => {
    const db = fakeDb();
    await expect(consumeRaceAuthNonce(db, claim)).resolves.toBe(true);
    await expect(consumeRaceAuthNonce(db, claim)).rejects.toThrow('nonce_rejected');
  });
  it('allows same nonce in a separate environment namespace', async () => {
    const db = fakeDb();
    await consumeRaceAuthNonce(db, claim);
    await expect(consumeRaceAuthNonce(db, { ...claim, environment: 'production' })).resolves.toBe(true);
  });
  it('allows only one of concurrent duplicate consumers', async () => {
    const db = fakeDb();
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => consumeRaceAuthNonce(db, claim)));
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  });
  it('rejects expired claims and unconfirmed commits', async () => {
    await expect(consumeRaceAuthNonce(fakeDb(), { ...claim, nowSeconds: 1060 })).rejects.toThrow('invalid_nonce_claims');
    const bad = { prepare: () => ({ bind: () => ({ run: async () => ({ success: false }) }) }) };
    await expect(consumeRaceAuthNonce(bad, claim)).rejects.toThrow('nonce_rejected');
  });
});
