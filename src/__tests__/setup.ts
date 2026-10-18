import { vi, beforeEach } from 'vitest';

// Silence background analytics fetch errors during headless tests
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('/analytics/track/batch') || url.includes('localhost:3000')) {
        return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
      }
      return Promise.reject(new Error(`Unhandled fetch to ${url}`));
    })
  );
});
