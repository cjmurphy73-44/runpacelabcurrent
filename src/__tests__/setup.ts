import { vi } from 'vitest';

if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = vi.fn().mockImplementation((url, options) => {
    if (typeof url === 'string' && url.includes('/analytics/track/batch')) {
      return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
    }
    return originalFetch ? originalFetch(url, options) : Promise.reject(new Error(`Unmocked fetch: ${url}`));
  });
}
