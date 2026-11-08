import { describe, expect, it } from 'vitest';
import { isExternalSyncEnabled } from './externalSyncGuard.ts';

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
