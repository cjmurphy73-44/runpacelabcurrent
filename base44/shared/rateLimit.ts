// base44/shared/rateLimit.ts
// Per-worker in-memory sliding-window rate limiter. Synchronous claim (no await
// between check and mutate) so a single worker can't double-grant a slot under
// concurrent in-flight requests. Not shared across worker instances — acceptable
// for abuse prevention; the plan gate is the hard boundary.
//
//   import { claimRateLimit } from '../../shared/rateLimit.ts';
//   if (!claimRateLimit(`synth:${user.id}`, 20, 24 * 3600 * 1000)) return 429;

const buckets = new Map<string, number[]>();
const GC_THRESHOLD = 5000;

export function claimRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;
  const arr = buckets.get(key) || [];
  // Drop expired stamps.
  let i = 0;
  while (i < arr.length && arr[i] < cutoff) i++;
  const fresh = i < arr.length ? arr.slice(i) : [];
  if (fresh.length >= max) {
    buckets.set(key, fresh);
    return false;
  }
  fresh.push(now);
  buckets.set(key, fresh);

  // Light GC so a busy multi-user worker doesn't grow the map unbounded.
  if (buckets.size > GC_THRESHOLD) {
    for (const [k, v] of buckets) {
      if (!v || v.length === 0 || (v[v.length - 1] ?? now) < cutoff) buckets.delete(k);
    }
  }
  return true;
}