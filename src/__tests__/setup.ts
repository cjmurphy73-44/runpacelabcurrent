import { vi } from 'vitest';

const originalFetch = global.fetch;
global.fetch = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input.toString();
  if (url.includes('analytics/track/batch')) {
    return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
  }
  if (originalFetch) {
    return originalFetch(input, init);
  }
  return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
});
