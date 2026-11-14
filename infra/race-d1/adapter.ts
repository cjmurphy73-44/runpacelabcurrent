// D1 implementation of the provider-neutral RaceResult persistence port.
// Adapter is NOT deployed, and no Worker route or credentials are configured.
// The caller MUST independently authenticate and authorize ownerId.
import { RacePersistenceError } from '../../base44/shared/racePersistencePort.ts';

const fingerprint = c => JSON.stringify([
  c.identity, c.race.race_date, c.race.sport,
  c.race.distance_m, c.race.elapsed_seconds,
  c.race.event_name ?? '', c.race.notes ?? '',
]);
const errorText = e => String(e?.message || e || '');
const rowToResult = r => ({
  id: r.id, ownerId: r.owner_id, identity: r.race_identity,
  revision: r.revision, race: {
    race_date: r.race_date, sport: r.sport,
    distance_m: r.distance_m, elapsed_seconds: r.elapsed_seconds,
  },
});

export function createD1RaceAdapter(db, uuid = () => crypto.randomUUID()) {
  if (!db || typeof db.batch !== 'function' || typeof db.prepare !== 'function') {
    throw new RacePersistenceError('d1_database_required');
  }
  return {
    async insertUniqueIdempotent(c) {
      const fp = fingerprint(c);
      const id = uuid();
      try {
        // D1 batch executes these statements as one atomic transaction.
        // If either unique constraint fails, all statements roll back.
        const results = await db.batch([
          db.prepare('INSERT INTO race_requests(owner_id,request_key,request_fingerprint) VALUES (?,?,?)')
            .bind(c.ownerId, c.requestKey, fp),
          db.prepare('INSERT INTO race_results(id,owner_id,race_identity,race_date,sport,distance_m,elapsed_seconds) VALUES (?,?,?,?,?,?,?)')
            .bind(id, c.ownerId, c.identity, c.race.race_date, c.race.sport, c.race.distance_m, c.race.elapsed_seconds),
          db.prepare('UPDATE race_requests SET race_id=? WHERE owner_id=? AND request_key=?')
            .bind(id, c.ownerId, c.requestKey),
        ]);
        if (results.length !== 3 || results.some(result => result.success !== true)) {
          throw new RacePersistenceError('transaction_not_confirmed');
        }
        return { id, ownerId: c.ownerId, identity: c.identity, revision: 1, race: c.race, replay: false };
      } catch (error) {
        // An existing idempotency key may be replayed, but a duplicate race
        // under a different request key is a conflict. Never retry the batch.
        const request = await db.prepare(
          'SELECT request_fingerprint,race_id FROM race_requests WHERE owner_id=? AND request_key=?'
        ).bind(c.ownerId, c.requestKey).first();
        if (request) {
          if (request.request_fingerprint !== fp) throw new RacePersistenceError('idempotency_key_reused');
          if (!request.race_id) throw new RacePersistenceError('incomplete_idempotency_record');
          const row = await db.prepare(
            'SELECT * FROM race_results WHERE id=? AND owner_id=?'
          ).bind(request.race_id, c.ownerId).first();
          if (!row) throw new RacePersistenceError('incomplete_idempotency_record');
          return { ...rowToResult(row), replay: true };
        }
        const collision = await db.prepare(
          'SELECT id FROM race_results WHERE owner_id=? AND race_identity=?'
        ).bind(c.ownerId, c.identity).first();
        if (collision) throw new RacePersistenceError('duplicate_race');
        throw new RacePersistenceError('transaction_failed');
      }
    },

    async correctIfRevision(c) {
      // Single conditional UPDATE is atomic in SQLite. Triggers enforce audit
      // and reject unsafe changes within the same transaction.
      let row;
      try {
        row = await db.prepare(
          `UPDATE race_results
             SET race_identity=?, race_date=?, sport=?, distance_m=?,
                 elapsed_seconds=?, revision=revision+1, updated_at=CURRENT_TIMESTAMP
           WHERE id=? AND owner_id=? AND revision=?
           RETURNING *`
        ).bind(c.identity, c.race.race_date, c.race.sport,
          c.race.distance_m, c.race.elapsed_seconds, c.id, c.ownerId, c.expectedRevision).first();
      } catch (error) {
        const msg = errorText(error);
        if (msg.includes('UNIQUE constraint failed')) throw new RacePersistenceError('duplicate_race');
        throw new RacePersistenceError('transaction_failed');
      }
      if (row) return rowToResult(row);
      const existing = await db.prepare('SELECT revision FROM race_results WHERE id=? AND owner_id=?')
        .bind(c.id, c.ownerId).first();
      throw new RacePersistenceError(existing ? 'revision_conflict' : 'not_found');
    },
  };
}
