// D1 atomic correction replay adapter, not connected to any Worker or Base44 route.
// Assumes D1 batch executes statements in order in one rollback-on-error transaction.
import { RacePersistenceError } from '../../base44/shared/racePersistencePort.ts';
import { canonicalRaceIdentity } from '../../base44/shared/raceAtomicContract.ts';

function fingerprint(c, identity) {
  return JSON.stringify([1, c.id, c.ownerId, c.expectedRevision, identity,
    c.race.event_name ?? '', c.race.notes ?? '']);
}
function validate(c) {
  if (!c || typeof c.id !== 'string' || !c.id ||
      typeof c.ownerId !== 'string' || !c.ownerId ||
      typeof c.requestKey !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(c.requestKey) ||
      !Number.isSafeInteger(c.expectedRevision) || c.expectedRevision < 1) {
    throw new RacePersistenceError('invalid_correction');
  }
  return canonicalRaceIdentity({ ...c.race, athlete_id: c.ownerId });
}
export function createD1CorrectionReplayAdapter(db, uuid = () => crypto.randomUUID()) {
  if (!db || typeof db.prepare !== 'function' || typeof db.batch !== 'function') {
    throw new RacePersistenceError('d1_database_required');
  }
  return {
    async correctAndRecordAtomically(c) {
      const identity = validate(c);
      const fp = fingerprint(c, identity);
      const snapshot = { id: c.id, ownerId: c.ownerId, identity,
        revision: c.expectedRevision + 1, race: c.race };
      const assertionId = uuid();
      try {
        // UNIQUE(owner_id, request_key) protects retries; unique race identity
        // and revision predicate protect collisions and concurrent corrections.
        // The CHECK assertion aborts the whole batch when UPDATE changed zero rows.
        const results = await db.batch([
          db.prepare(`INSERT INTO race_correction_requests
            (owner_id,request_key,request_fingerprint,race_id,response_json)
            VALUES (?,?,?,?,?)`).bind(c.ownerId, c.requestKey, fp, c.id, JSON.stringify(snapshot)),
          db.prepare(`UPDATE race_results
            SET race_identity=?,race_date=?,sport=?,distance_m=?,elapsed_seconds=?,
                revision=revision+1,updated_at=CURRENT_TIMESTAMP
            WHERE id=? AND owner_id=? AND revision=?`)
            .bind(identity, c.race.race_date, c.race.sport, c.race.distance_m,
              c.race.elapsed_seconds, c.id, c.ownerId, c.expectedRevision),
          db.prepare('INSERT INTO race_correction_assertions(assertion_id,affected) VALUES (?,changes())')
            .bind(assertionId),
          db.prepare('DELETE FROM race_correction_assertions WHERE assertion_id=?')
            .bind(assertionId),
        ]);
        if (results.length !== 4 || results.some(r => r.success !== true)) {
          throw new RacePersistenceError('transaction_not_confirmed');
        }
        return { ...snapshot, replay: false };
      } catch {
        // Never retry an uncertain write. A durable snapshot allows safe
        // recovery when the transaction committed but the response was lost.
        const request = await db.prepare(`SELECT request_fingerprint,response_json,race_id
          FROM race_correction_requests WHERE owner_id=? AND request_key=?`)
          .bind(c.ownerId, c.requestKey).first();
        if (request) {
          if (request.request_fingerprint !== fp) throw new RacePersistenceError('idempotency_key_reused');
          let saved;
          try { saved = JSON.parse(request.response_json); } catch {
            throw new RacePersistenceError('invalid_idempotency_snapshot');
          }
          if (request.race_id !== c.id || saved.id !== c.id ||
              saved.ownerId !== c.ownerId || saved.identity !== identity ||
              saved.revision !== c.expectedRevision + 1) {
            throw new RacePersistenceError('invalid_idempotency_snapshot');
          }
          return { ...saved, replay: true };
        }
        const existing = await db.prepare('SELECT revision FROM race_results WHERE id=? AND owner_id=?')
          .bind(c.id, c.ownerId).first();
        if (!existing) throw new RacePersistenceError('not_found');
        if (existing.revision !== c.expectedRevision) throw new RacePersistenceError('revision_conflict');
        const collision = await db.prepare('SELECT id FROM race_results WHERE owner_id=? AND race_identity=?')
          .bind(c.ownerId, identity).first();
        if (collision && collision.id !== c.id) throw new RacePersistenceError('duplicate_race');
        throw new RacePersistenceError('transaction_failed');
      }
    },
  };
}
