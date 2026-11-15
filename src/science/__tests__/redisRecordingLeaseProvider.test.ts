import { describe, expect, it, vi } from 'vitest';
import { createRedisAtomicLeaseProvider, createRedisRestTransport } from '../../../base44/shared/redisRecordingLeaseProvider';

describe('atomic Redis lease provider (mock REST transport)', () => {
  it('uses one atomic EVAL to acquire with monotonically increasing fencing', async () => {
    const transport = vi.fn(async () => 7);
    const provider = createRedisAtomicLeaseProvider(transport, () => 1000, () => 'unique-token');
    const grant = await provider.acquire('recording-a', 10000);
    expect(grant).toEqual({ token: 'unique-token', fence: 7, expires_at_ms: 11000 });
    expect(transport.mock.calls[0][0][0]).toBe('EVAL');
    expect(transport.mock.calls[0][0][2]).toBe(2);
  });
  it('returns no grant on contention and refuses invalid fences', async () => {
    const transport = vi.fn(async () => null as any);
    const provider = createRedisAtomicLeaseProvider(transport, () => 1000, () => 'token');
    expect(await provider.acquire('scope', 10000)).toBeNull();
    transport.mockResolvedValueOnce(0 as any);
    await expect(provider.acquire('scope', 10000)).rejects.toThrow('invalid_redis_fence');
  });
  it('checks token and fence before release and refuses expired grants', async () => {
    const transport = vi.fn(async () => 1);
    const provider = createRedisAtomicLeaseProvider(transport, () => 1000, () => 'token');
    const grant = { token: 'token', fence: 3, expires_at_ms: 5000 };
    expect(await provider.assertCurrent('scope', grant)).toBe(true);
    await provider.releaseIfOwner('scope', grant);
    expect(transport.mock.calls[1][0].at(-1)).toBe('token:3');
    expect(await provider.assertCurrent('scope', { ...grant, expires_at_ms: 999 })).toBe(false);
    expect(transport).toHaveBeenCalledTimes(2);
  });
  it('fails closed on Redis HTTP errors without leaking credentials', async () => {
    const fetcher = vi.fn(async () => ({ ok: false }));
    const transport = createRedisRestTransport('https://redis.example.test/', 'secret-token', fetcher as any);
    await expect(transport(['PING'])).rejects.toThrow('redis_http_failure');
    expect(fetcher.mock.calls[0][0]).toBe('https://redis.example.test');
  });
});
