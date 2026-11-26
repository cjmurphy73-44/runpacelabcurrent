import { MAX_PRIVATE_RECORDING_BYTES, hashRecording, readPrivateRecording, savePrivateRecording } from './privateRecordingArchive.ts';
import type { ArchiveStore } from './privateRecordingArchive.ts';

export const MAX_COROS_FIT_BYTES = MAX_PRIVATE_RECORDING_BYTES;
export const hashCorosRecording = hashRecording;

// Reject truncated or concatenated FIT files before publishing any bytes.
export function isCompleteCorosFit(bytes: Uint8Array) {
  if (bytes.length < 14 || bytes[0] < 12 || bytes[0] + 2 > bytes.length ||
    String.fromCharCode(...bytes.subarray(8, 12)) !== '.FIT') return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return bytes[0] + view.getUint32(4, true) + 2 === bytes.length;
}

type CorosScope = { athlete_id: string; session_id: string; provider_activity_id: string };

export function readCorosArchive(store: ArchiveStore, scope: CorosScope) {
  return readPrivateRecording(store, scope, isCompleteCorosFit);
}

export function saveCorosArchive(
  store: ArchiveStore, scope: CorosScope, ownerUserId: string, bytes: Uint8Array<ArrayBuffer>,
) {
  return savePrivateRecording(store, scope, ownerUserId, bytes, isCompleteCorosFit);
}
