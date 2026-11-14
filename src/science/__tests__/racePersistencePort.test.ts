import { describe, expect, it } from 'vitest';
import { createRacePersistenceService, RacePersistenceError } from '../../../base44/shared/racePersistencePort';

const race = { race_date: '2026-11-01', sport: 'running', distance_m: 5000, elapsed_seconds: 1200 };
const cmd = (requestKey, ownerId = 'athlete-1') => ({ requestKey, ownerId, race });

function mockTransactionalProvider() {
  const byIdentity = new Map();
  const byRequest = new Map();
  const byId = new Map();
  let sequence = 0;
  const snapshot = () => Array.from(byId.values()).map(r => ({ ...r }));
  return {
    snapshot,
    async insertUniqueIdempotent(c) {
      // Mock commit is synchronous before promise resolution. This models a
      // transaction's serialization point, NOT a real database guarantee.
      const requestIdentity = c.ownerId + ':' + c.requestKey;
      const fingerprint = c.identity;
      const replay = byRequest.get(requestIdentity);
      if (replay) {
        if (replay.fingerprint !== fingerprint) throw new RacePersistenceError('idempotency_key_reused');
        return { ...replay.record, replay: true };
      }
      if (byIdentity.has(c.identity)) throw new RacePersistenceError('duplicate_race');
      const record = { id: String(++sequence), ownerId: c.ownerId, identity: c.identity, race: c.race, revision: 1 };
      byId.set(record.id, record);
      byIdentity.set(c.identity, record.id);
      byRequest.set(requestIdentity, { fingerprint, record });
      return { ...record, replay: false };
    },
    async correctIfRevision(c) {
      const existing = byId.get(c.id);
      if (!existing || existing.ownerId !== c.ownerId) throw new RacePersistenceError('not_found');
      if (existing.revision !== c.expectedRevision) throw new RacePersistenceError('revision_conflict');
      const colliding = byIdentity.get(c.identity);
      if (colliding && colliding !== c.id) throw new RacePersistenceError('duplicate_race');
      byIdentity.delete(existing.identity);
      const next = { ...existing, race: c.race, identity: c.identity, revision: existing.revision + 1 };
      byId.set(c.id, next);
      byIdentity.set(c.identity, c.id);
      return { ...next };
    },
  };
}

describe('atomic persistence port with a serialized mock', () => {
  it('requires an explicit transactional provider', () => {
    expect(() => createRacePersistenceService(null)).toThrow('atomic_provider_required');
  });
  it('concurrent identical submissions commit exactly once', async () => {
    const db = mockTransactionalProvider();
    const service = createRacePersistenceService(db);
    const result = await Promise.allSettled(Array.from({ length: 12 }, (_, i) => service.create(cmd('request-key-123456-' + i))));
    expect(result.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(result.filter(r => r.status === 'rejected')).toHaveLength(11);
    expect(db.snapshot()).toHaveLength(1);
  });
  it('replays identical idempotency requests without another write', async () => {
    const db = mockTransactionalProvider();
    const service = createRacePersistenceService(db);
    const first = await service.create(cmd('request-key-123456'));
    const second = await service.create(cmd('request-key-123456'));
    expect(first.id).toBe(second.id);
    expect(second.replay).toBe(true);
    expect(db.snapshot()).toHaveLength(1);
  });
  it('rejects reuse of request key for different payload', async () => {
    const service = createRacePersistenceService(mockTransactionalProvider());
    await service.create(cmd('request-key-123456'));
    await expect(service.create({ ...cmd('request-key-123456'), race: { ...race, elapsed_seconds: 1201 } }))
      .rejects.toThrow('idempotency_key_reused');
  });
  it('concurrent corrections cannot both commit at the same revision', async () => {
    const db = mockTransactionalProvider();
    const service = createRacePersistenceService(db);
    const original = await service.create(cmd('request-key-123456'));
    const changes = [1201, 1202].map(elapsed_seconds => service.correct({
      ownerId: 'athlete-1', id: original.id, expectedRevision: 1,
      race: { ...race, elapsed_seconds },
    }));
    const results = await Promise.allSettled(changes);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(db.snapshot()[0].revision).toBe(2);
  });
  it('rejects foreign-owner corrections', async () => {
    const db = mockTransactionalProvider();
    const service = createRacePersistenceService(db);
    const original = await service.create(cmd('request-key-123456'));
    await expect(service.correct({ ownerId: 'athlete-2', id: original.id, expectedRevision: 1, race }))
      .rejects.toThrow('not_found');
  });
  it('isolates identical race performances across athletes', async () => {
    const db = mockTransactionalProvider();
    const service = createRacePersistenceService(db);
    await Promise.all([service.create(cmd('request-key-123456', 'athlete-1')),
      service.create(cmd('request-key-123456', 'athlete-2'))]);
    expect(db.snapshot()).toHaveLength(2);
  });
});
