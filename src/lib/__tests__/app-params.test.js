import { beforeEach, describe, expect, it } from 'vitest';
import { getAppParams } from '../app-params';

describe('SDK session bootstrap', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('restores a session stored by SDK password login', () => {
    window.localStorage.setItem('base44_access_token', 'synthetic-sdk-token');
    expect(getAppParams().token).toBe('synthetic-sdk-token');
  });

  it('consumes an OAuth callback token and retains it for the next page load', () => {
    window.history.replaceState({}, '', '/?access_token=synthetic-callback-token');
    expect(getAppParams().token).toBe('synthetic-callback-token');
    expect(new URLSearchParams(window.location.search).has('access_token')).toBe(false);
    expect(getAppParams().token).toBe('synthetic-callback-token');
  });

  it('supports the SDK legacy storage key', () => {
    window.localStorage.setItem('token', 'synthetic-legacy-token');
    expect(getAppParams().token).toBe('synthetic-legacy-token');
  });

  it('does not invent a session when storage and URL contain no token', () => {
    expect(getAppParams().token).toBeNull();
  });
});
