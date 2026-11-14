// Concrete atomic Redis REST lease provider for server-only recording workers.
// Requires an Upstash-compatible Redis REST endpoint and server-side bearer token.
// WARNING: Base44 chunk/manifest writes must ALSO enforce fencing atomically;
// a Redis lease alone cannot stop a paused worker from writing after expiry.
// Do not activate live ingestion until storage-side fencing is implemented.
// @ts-ignore Deno runtime requires explicit .ts extension.
import type { AtomicLeaseProvider, FencedLeaseGrant } from './fencedRecordingLease.ts';

const ACQUIRE = `
if redis.call('EXISTS', KEYS[1]) == 1 then return nil end
local fence = redis.call('INCR', KEYS[2])
redis.call('PSETEX', KEYS[1], ARGV[2], ARGV[1] .. ':' .. fence)
return fence
`;
const ASSERT = `
return redis.call('GET', KEYS[1]) == ARGV[1] and 1 or 0
`;
const RELEASE = `
if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end
return 0
`;

type RedisTransport = (command: (string | number)[]) => Promise<unknown>;
export function createRedisRestTransport(
  url: string, bearerToken: string, fetcher: typeof fetch = fetch,
): RedisTransport {
  if (!/^https:\/\//.test(url) || !bearerToken?.trim()) throw Error('redis_credentials_required');
  const endpoint = url.replace(/\/+$/, '');
  return async command => {
    const response = await fetcher(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${bearerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
    });
    if (!response.ok) throw Error('redis_http_failure');
    const payload = await response.json();
    if (!payload || payload.error) throw Error('redis_command_failure');
    return payload.result;
  };
}

export function createRedisAtomicLeaseProvider(
  transport: RedisTransport,
  now: () => number = Date.now,
  tokenFactory: () => string = () => crypto.randomUUID(),
): AtomicLeaseProvider {
  if (typeof transport !== 'function') throw Error('redis_transport_required');
  const redisKey = (scope: string) => `tpl:recording:lease:${scope}`;
  const fenceKey = (scope: string) => `tpl:recording:fence:${scope}`;
  const valid = (g: FencedLeaseGrant) =>
    !!g && typeof g.token === 'string' && g.token.length > 0 &&
    Number.isSafeInteger(g.fence) && g.fence > 0;
  return {
    async acquire(scope, ttlMs) {
      if (!scope || !Number.isInteger(ttlMs) || ttlMs < 1000 || ttlMs > 120000) {
        throw Error('invalid_lease_request');
      }
      const token = tokenFactory();
      if (!token?.trim() || token.includes(':')) throw Error('invalid_lease_token');
      const fence = await transport(['EVAL', ACQUIRE, 2, redisKey(scope), fenceKey(scope), token, ttlMs]);
      if (fence === null) return null;
      if (!Number.isSafeInteger(fence) || (fence as number) < 1) throw Error('invalid_redis_fence');
      return { token, fence: fence as number, expires_at_ms: now() + ttlMs };
    },
    async assertCurrent(scope, grant) {
      if (!scope || !valid(grant) || grant.expires_at_ms <= now()) return false;
      return (await transport(['EVAL', ASSERT, 1, redisKey(scope), `${grant.token}:${grant.fence}`])) === 1;
    },
    async releaseIfOwner(scope, grant) {
      if (!scope || !valid(grant)) throw Error('invalid_lease_release');
      await transport(['EVAL', RELEASE, 1, redisKey(scope), `${grant.token}:${grant.fence}`]);
    },
  };
}
