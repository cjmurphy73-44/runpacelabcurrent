// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

describe('synthetic test network isolation', () => {
  it('rejects unexpected HTTP calls rather than reaching the network', async () => {
    await expect(fetch('https://example.invalid/private-test')).rejects.toThrow(
      'Unmocked fetch: https://example.invalid/private-test',
    );
  });

  it('mocks only the known analytics batch endpoint', async () => {
    const response = await fetch('http://localhost:3000/api/apps/test-app/analytics/track/batch');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
  });
});
