// Adapter contract for a REAL external atomic/fenced lease provider.
// Not a lock implementation: a Base44 read-then-create is not atomic.
// Do not wire live ingestion until an infrastructure provider implements this
// contract with atomic acquisition, fencing and owner-checked release.
// @ts-ignore Deno runtime requires explicit .ts extension.
import type { ExclusiveRecordingLease } from './recordingSessionCommit.ts';

export type FencedLeaseGrant = {
  token: string;
  fence: number;
  expires_at_ms: number;
};
export type AtomicLeaseProvider = {
  acquire: (key: string, ttlMs: number) => Promise<FencedLeaseGrant | null>;
  assertCurrent: (key: string, grant: FencedLeaseGrant) => Promise<boolean>;
  releaseIfOwner: (key: string, grant: FencedLeaseGrant) => Promise<void>;
};
export const RECORDING_LEASE_TTL_MS = 120000;

export function createFencedRecordingLease(
  provider: AtomicLeaseProvider,
  now: () => number = Date.now,
): ExclusiveRecordingLease {
  if (!provider || typeof provider.acquire !== 'function' ||
      typeof provider.assertCurrent !== 'function' || typeof provider.releaseIfOwner !== 'function') {
    throw Error('atomic_lease_provider_required');
  }
  return {
    async runExclusive(scope, work) {
      if (!scope?.athlete_id?.trim() || !scope?.session_id?.trim() ||
          typeof work !== 'function') throw Error('invalid_lease_scope');
      const key = JSON.stringify(['recording', scope.athlete_id, scope.session_id]);
      const grant = await provider.acquire(key, RECORDING_LEASE_TTL_MS);
      if (!grant || typeof grant.token !== 'string' || !grant.token.trim() ||
          !Number.isSafeInteger(grant.fence) || grant.fence < 1 ||
          !Number.isFinite(grant.expires_at_ms) ||
          grant.expires_at_ms <= now() || grant.expires_at_ms > now() + RECORDING_LEASE_TTL_MS) {
        throw Error('lease_not_acquired');
      }
      try {
        if (!(await provider.assertCurrent(key, grant))) throw Error('lease_fence_lost');
        const result = await work();
        // Detect lease expiry or fencing before reporting success.
        // IMPORTANT: the actual store's conditional writes MUST enforce the
        // fence at each write; this post-check alone cannot prevent stale writes.
        if (grant.expires_at_ms <= now() || !(await provider.assertCurrent(key, grant))) {
          throw Error('lease_fence_lost');
        }
        return result;
      } finally {
        // Never mask a failed commit with release failure. A lease provider
        // must release only if the exact token still owns this scope.
        try { await provider.releaseIfOwner(key, grant); } catch { /* TTL fallback */ }
      }
    },
  };
}
