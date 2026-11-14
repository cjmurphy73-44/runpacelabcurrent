// Provider-neutral atomic RaceResult persistence port.
// The provider MUST enforce unique identities, durable idempotency and CAS in its
// own transactional storage. No Base44 entity CRUD adapter is safe by default.
import { canonicalRaceIdentity } from './raceAtomicContract.ts';

export class RacePersistenceError extends Error {
  constructor(code) { super(code); this.name = 'RacePersistenceError'; this.code = code; }
}

export function validateRaceWriteCommand(command) {
  if (!command || typeof command !== 'object' ||
      typeof command.ownerId !== 'string' || !command.ownerId ||
      typeof command.requestKey !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(command.requestKey)) {
    throw new RacePersistenceError('invalid_command');
  }
  return canonicalRaceIdentity({ ...command.race, athlete_id: command.ownerId });
}

export function createRacePersistenceService(port) {
  if (!port || typeof port.insertUniqueIdempotent !== 'function' ||
      typeof port.correctIfRevision !== 'function') throw new RacePersistenceError('atomic_provider_required');
  return Object.freeze({
    async create(command) {
      const identity = validateRaceWriteCommand(command);
      // Provider must transactionally reserve both (owner, requestKey) and
      // (owner, race identity), storing request fingerprint and replay response.
      return port.insertUniqueIdempotent({ ...command, identity });
    },
    async correct(command) {
      if (!command || typeof command.ownerId !== 'string' || !command.ownerId ||
          typeof command.id !== 'string' || !command.id ||
          !Number.isSafeInteger(command.expectedRevision) || command.expectedRevision < 1) {
        throw new RacePersistenceError('invalid_correction');
      }
      const identity = canonicalRaceIdentity({ ...command.race, athlete_id: command.ownerId });
      // Provider must execute owner-scoped conditional UPDATE, identity uniqueness
      // and append-only audit within the SAME transaction.
      return port.correctIfRevision({ ...command, identity });
    },
  });
}
