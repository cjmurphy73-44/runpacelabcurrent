// Store original recording bytes in isolated, immutable upload attempts. A manifest is
// published only after reading back every part. Concurrent attempts use different
// IDs, so failed or interleaved writes cannot assemble into a valid recording.
const LEGACY_PART_BYTES = 24 * 1024;
// 12 KiB expands to 16 KiB in base64, within the hosted entity field limit.
const PART_BYTES = 12 * 1024;
const PARTS_PER_WRITE = 10;
export const MAX_PRIVATE_RECORDING_BYTES = 2 * 1024 * 1024;
const MAX_PARTS = Math.ceil(MAX_PRIVATE_RECORDING_BYTES / PART_BYTES);

type Scope = { athlete_id: string; session_id: string; provider_activity_id?: string };
export type ArchiveStore = {
  filter: (query: Record<string, unknown>, sort: string, limit: number) => Promise<any[]>;
  bulkCreate: (rows: Record<string, unknown>[]) => Promise<unknown>;
  create: (row: Record<string, unknown>) => Promise<unknown>;
  deleteMany: (query: Record<string, unknown>) => Promise<unknown>;
};
type Manifest = {
  attempt_id: string;
  byte_count: number;
  part_count: number;
  part_bytes?: number;
  sha256: string;
};

export function recordingStorageError(error: any) {
  const known = typeof error?.message === 'string' &&
    /^(Invalid recording archive|Incomplete recording archive|Recording archive (checksum|publication)|Unsupported recording archive)/.test(error.message);
  return {
    reason: known ? error.message : 'Storage request did not complete',
    status: Number(error?.response?.status ?? error?.status) || undefined,
  };
}

function sameScope(row: any, scope: Scope) {
  return row?.athlete_id === scope.athlete_id && row.session_id === scope.session_id &&
    (scope.provider_activity_id === undefined || row.provider_activity_id === scope.provider_activity_id);
}

export async function hashRecording(bytes: Uint8Array<ArrayBuffer>) {
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), (value) => value.toString(16).padStart(2, '0')).join('');
}

async function readParts(store: ArchiveStore, scope: Scope, manifest: Manifest, validate: (bytes: Uint8Array) => boolean) {
  const { attempt_id, byte_count, part_count, sha256 } = manifest;
  const partBytes = manifest.part_bytes ?? LEGACY_PART_BYTES;
  if (!attempt_id || !Number.isInteger(byte_count) || byte_count < 14 ||
    byte_count > MAX_PRIVATE_RECORDING_BYTES || ![PART_BYTES, LEGACY_PART_BYTES].includes(partBytes) ||
    part_count !== Math.ceil(byte_count / partBytes) ||
    !/^[0-9a-f]{64}$/.test(sha256)) throw new Error('Invalid recording archive manifest');
  const parts = await store.filter({ ...scope, attempt_id, kind: 'part' }, 'part_index', MAX_PARTS + 1);
  if (!Array.isArray(parts) || parts.length !== part_count) throw new Error('Incomplete recording archive');

  const bytes = new Uint8Array(byte_count);
  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];
    const offset = index * partBytes;
    const size = Math.min(partBytes, byte_count - offset);
    if (!sameScope(part, scope) || part.attempt_id !== attempt_id || part.kind !== 'part' ||
      part.part_index !== index || typeof part.data_b64 !== 'string' ||
      part.data_b64.length !== Math.ceil(size / 3) * 4) throw new Error('Invalid recording archive part');
    const decoded = atob(part.data_b64);
    if (decoded.length !== size) throw new Error('Invalid recording archive part size');
    for (let i = 0; i < size; i++) bytes[offset + i] = decoded.charCodeAt(i);
  }
  if (!validate(bytes) || await hashRecording(bytes) !== sha256) throw new Error('Recording archive checksum mismatch');
  return bytes;
}

export async function readPrivateRecording(
  store: ArchiveStore, scope: Scope, validate: (bytes: Uint8Array) => boolean,
  newest = true,
  sha256?: string,
) {
  const manifests = await store.filter({
    ...scope, kind: 'manifest', ...(sha256 ? { sha256 } : {}),
  }, newest ? '-created_date' : 'created_date', 1);
  if (!Array.isArray(manifests) || manifests.length > 1) throw new Error('Invalid recording archive lookup');
  if (!manifests.length) return null;
  const manifest = manifests[0];
  if (!sameScope(manifest, scope) || manifest.kind !== 'manifest' || (sha256 && manifest.sha256 !== sha256)) {
    throw new Error('Invalid recording archive scope');
  }
  return readParts(store, scope, manifest, validate);
}

export async function savePrivateRecording(
  store: ArchiveStore,
  scope: Scope,
  ownerUserId: string,
  bytes: Uint8Array<ArrayBuffer>,
  validate: (bytes: Uint8Array) => boolean,
) {
  if (!ownerUserId || bytes.length < 14 || bytes.length > MAX_PRIVATE_RECORDING_BYTES || !validate(bytes)) {
    throw new Error('Unsupported recording archive size or owner');
  }
  const attempt_id = crypto.randomUUID();
  const manifest = {
    attempt_id, byte_count: bytes.length, part_count: Math.ceil(bytes.length / PART_BYTES),
    part_bytes: PART_BYTES, sha256: await hashRecording(bytes),
  };
  const rows = Array.from({ length: manifest.part_count }, (_, part_index) => ({
    ...scope, owner_user_id: ownerUserId, attempt_id, part_index, kind: 'part',
    data_b64: btoa(String.fromCharCode(...bytes.subarray(part_index * PART_BYTES, (part_index + 1) * PART_BYTES))),
  }));
  try {
    for (let offset = 0; offset < rows.length; offset += PARTS_PER_WRITE) {
      await store.bulkCreate(rows.slice(offset, offset + PARTS_PER_WRITE));
    }
    await readParts(store, scope, manifest, validate);
  } catch (error) {
    // Only this unpublished attempt can be cleaned up. A later timeout during
    // publication is reconciled by reading its manifest, never by deleting it.
    console.warn('Recording archive parts could not be staged.', recordingStorageError(error));
    await store.deleteMany({ ...scope, attempt_id, kind: 'part' }).catch(() => {});
    throw error;
  }
  try {
    await store.create({ ...scope, ...manifest, owner_user_id: ownerUserId, kind: 'manifest' });
  } catch {
    // A timed-out write may have committed. Verify publication for this attempt.
  }
  const confirmed = await store.filter({ ...scope, kind: 'manifest', attempt_id }, '-created_date', 2);
  if (confirmed.length !== 1 || !sameScope(confirmed[0], scope) ||
    confirmed[0].kind !== 'manifest' || confirmed[0].attempt_id !== attempt_id ||
    confirmed[0].part_count !== manifest.part_count || confirmed[0].byte_count !== manifest.byte_count ||
      confirmed[0].part_bytes !== manifest.part_bytes ||
    confirmed[0].sha256 !== manifest.sha256) throw new Error('recording archive publication could not be confirmed');
  return readParts(store, scope, confirmed[0], validate);
}
