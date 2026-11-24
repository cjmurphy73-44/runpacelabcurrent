// Store original FIT bytes in isolated, immutable upload attempts. A manifest is
// published only after reading back every part. Concurrent attempts use different
// IDs, so failed or interleaved writes cannot assemble into a valid recording.
const PART_BYTES = 24 * 1024;
export const MAX_COROS_FIT_BYTES = 2 * 1024 * 1024;
const MAX_PARTS = Math.ceil(MAX_COROS_FIT_BYTES / PART_BYTES);

// Reject truncated or concatenated FIT files before publishing any bytes.
export function isCompleteCorosFit(bytes: Uint8Array) {
  if (bytes.length < 14 || bytes[0] < 12 || bytes[0] + 2 > bytes.length ||
    String.fromCharCode(...bytes.subarray(8, 12)) !== '.FIT') return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return bytes[0] + view.getUint32(4, true) + 2 === bytes.length;
}

type Scope = { athlete_id: string; session_id: string; provider_activity_id: string };
type ArchiveStore = {
  filter: (query: Record<string, unknown>, sort: string, limit: number) => Promise<any[]>;
  bulkCreate: (rows: Record<string, unknown>[]) => Promise<unknown>;
  create: (row: Record<string, unknown>) => Promise<unknown>;
  deleteMany: (query: Record<string, unknown>) => Promise<unknown>;
};
type Manifest = {
  attempt_id: string;
  byte_count: number;
  part_count: number;
  sha256: string;
};

function sameScope(row: any, scope: Scope) {
  return row?.athlete_id === scope.athlete_id && row.session_id === scope.session_id &&
    row.provider_activity_id === scope.provider_activity_id;
}

export async function hashCorosRecording(bytes: Uint8Array<ArrayBuffer>) {
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), (value) => value.toString(16).padStart(2, '0')).join('');
}

async function readParts(store: ArchiveStore, scope: Scope, manifest: Manifest) {
  const { attempt_id, byte_count, part_count, sha256 } = manifest;
  if (!attempt_id || !Number.isInteger(byte_count) || byte_count < 14 ||
    byte_count > MAX_COROS_FIT_BYTES || part_count !== Math.ceil(byte_count / PART_BYTES) ||
    !/^[0-9a-f]{64}$/.test(sha256)) throw new Error('Invalid COROS archive manifest');
  const parts = await store.filter({ ...scope, attempt_id, kind: 'part' }, 'part_index', MAX_PARTS + 1);
  if (!Array.isArray(parts) || parts.length !== part_count) throw new Error('Incomplete COROS archive');

  const bytes = new Uint8Array(byte_count);
  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];
    const offset = index * PART_BYTES;
    const size = Math.min(PART_BYTES, byte_count - offset);
    if (!sameScope(part, scope) || part.attempt_id !== attempt_id || part.kind !== 'part' ||
      part.part_index !== index || typeof part.data_b64 !== 'string' ||
      part.data_b64.length !== Math.ceil(size / 3) * 4) throw new Error('Invalid COROS archive part');
    const decoded = atob(part.data_b64);
    if (decoded.length !== size) throw new Error('Invalid COROS archive part size');
    for (let i = 0; i < size; i++) bytes[offset + i] = decoded.charCodeAt(i);
  }
  if (!isCompleteCorosFit(bytes) || await hashCorosRecording(bytes) !== sha256) throw new Error('COROS archive checksum mismatch');
  return bytes;
}

export async function readCorosArchive(store: ArchiveStore, scope: Scope) {
  const manifests = await store.filter({ ...scope, kind: 'manifest' }, '-created_date', 1);
  if (!Array.isArray(manifests) || manifests.length > 1) throw new Error('Invalid COROS archive lookup');
  if (!manifests.length) return null;
  const manifest = manifests[0];
  if (!sameScope(manifest, scope) || manifest.kind !== 'manifest') throw new Error('Invalid COROS archive scope');
  return readParts(store, scope, manifest);
}

export async function saveCorosArchive(
  store: ArchiveStore,
  scope: Scope,
  ownerUserId: string,
  bytes: Uint8Array<ArrayBuffer>,
) {
  if (!ownerUserId || bytes.length > MAX_COROS_FIT_BYTES || !isCompleteCorosFit(bytes)) {
    throw new Error('Unsupported COROS archive size or owner');
  }
  const attempt_id = crypto.randomUUID();
  const manifest = {
    attempt_id, byte_count: bytes.length, part_count: Math.ceil(bytes.length / PART_BYTES), sha256: await hashCorosRecording(bytes),
  };
  const rows = Array.from({ length: manifest.part_count }, (_, part_index) => ({
    ...scope, owner_user_id: ownerUserId, attempt_id, part_index, kind: 'part',
    data_b64: btoa(String.fromCharCode(...bytes.subarray(part_index * PART_BYTES, (part_index + 1) * PART_BYTES))),
  }));
  try {
    for (let offset = 0; offset < rows.length; offset += 5) {
      await store.bulkCreate(rows.slice(offset, offset + 5));
    }
    await readParts(store, scope, manifest);
  } catch (error) {
    // Only this unpublished attempt can be cleaned up. A later timeout during
    // publication is reconciled by reading its manifest, never by deleting it.
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
    confirmed[0].sha256 !== manifest.sha256) throw new Error('COROS archive publication could not be confirmed');
  return readParts(store, scope, confirmed[0]);
}
