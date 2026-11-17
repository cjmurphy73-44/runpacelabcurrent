import { vi } from 'vitest';

// Fail closed in synthetic tests: no test may fall through to a real network
// transport. Individual tests may install explicit mocks for expected calls.
const mockFetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (url.includes('/analytics/track/batch')) {
    return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
  }
  return Promise.reject(new Error(`Unmocked fetch: ${url}`));
});

globalThis.fetch = mockFetch;
if (typeof window !== 'undefined') {
  window.fetch = mockFetch;
}
