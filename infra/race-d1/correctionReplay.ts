// Correction idempotency coordinator for a D1 transactional provider.
// IMPORTANT: This file is intentionally NOT wired to a Worker or live route.
// A production implementation must execute correction UPDATE, request insert,
// response snapshot and audit in ONE transaction. The port below requires
// that exact atomic operation and rejects providers without it.
export function createCorrectionReplayService(provider) {
  if (!provider || typeof provider.correctAndRecordAtomically !== 'function') {
    throw new Error('atomic_correction_provider_required');
  }
  return Object.freeze({
    async correct(command) {
      if (!command || typeof command.ownerId !== 'string' || !command.ownerId ||
          typeof command.id !== 'string' || !command.id ||
          typeof command.requestKey !== 'string' ||
          !/^[A-Za-z0-9_-]{16,128}$/.test(command.requestKey) ||
          !Number.isSafeInteger(command.expectedRevision) || command.expectedRevision < 1) {
        throw new Error('invalid_correction_request');
      }
      return provider.correctAndRecordAtomically(command);
    },
  });
}
