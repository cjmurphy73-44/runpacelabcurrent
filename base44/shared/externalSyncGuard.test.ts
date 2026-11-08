import { afterEach, describe, expect, it, vi } from 'vitest';
import { externalSyncBlockedResponse, isExternalSyncEnabled } from './externalSyncGuard.ts';

afterEach(() => vi.unstubAllGlobals());

describe('isExternalSyncEnabled', () => {
  it('always disables external sync in staging', () => {
    expect(isExternalSyncEnabled('staging', 'true')).toBe(false);
    expect(isExternalSyncEnabled('staging', 'false')).toBe(false);
  });

  it('requires explicit production environment and opt-in', () => {
    expect(isExternalSyncEnabled('production', 'true')).toBe(true);
    expect(isExternalSyncEnabled('production', 'false')).toBe(false);
    expect(isExternalSyncEnabled('production', undefined)).toBe(false);
  });

  it('fails closed for local, unknown, and missing environments', () => {
    expect(isExternalSyncEnabled('development', 'true')).toBe(false);
    expect(isExternalSyncEnabled(undefined, 'true')).toBe(false);
    expect(isExternalSyncEnabled(undefined, undefined)).toBe(false);
  });
});

describe('externalSyncBlockedResponse runtime configuration', () => {
  it('fails closed when the runtime is absent', async () => {
    vi.stubGlobal('Deno', undefined);
    const response = externalSyncBlockedResponse();
    expect(response?.status).toBe(503);
    expect(await response?.json()).toEqual({ error: 'External sync is disabled for this environment.' });
  });

  it.each(['TPL_ENVIRONMENT', 'TPL_EXTERNAL_SYNC_ENABLED'])('fails closed when reading %s is denied', (deniedName) => {
    vi.stubGlobal('Deno', { env: { get: (name: string) => {
      if (name === deniedName) throw new Error('Permission denied');
      return name === 'TPL_ENVIRONMENT' ? 'production' : 'true';
    } } });
    expect(externalSyncBlockedResponse()?.status).toBe(503);
  });

  it('permits the explicitly opted-in production configuration only', () => {
    vi.stubGlobal('Deno', { env: { get: (name: string) => name === 'TPL_ENVIRONMENT' ? 'production' : 'true' } });
    expect(externalSyncBlockedResponse()).toBeNull();
  });
});
