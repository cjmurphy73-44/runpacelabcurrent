import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAppParams } from '../app-params';

const productionAppId = '6a504ebe6a5a6d1be058226c';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
});

describe('Base44 deployment targeting', () => {
  it('pins the published site to its own app and functions regardless of editor bootstrap data', () => {
    vi.stubEnv('VITE_BASE44_APP_ID', 'wrong-app');
    vi.stubEnv('VITE_BASE44_APP_BASE_URL', 'https://wrong.example');
    const native = window;
    vi.stubGlobal('window', {
      ...native,
      localStorage: native.localStorage,
      location: new URL('https://trainpacelab.com/?app_id=wrong&app_base_url=https://wrong.example&functions_version=old'),
    });
    expect(getAppParams()).toMatchObject({
      appId: productionAppId, appBaseUrl: 'https://trainpacelab.com', serverUrl: 'https://trainpacelab.com', functionsVersion: '',
    });
  });
  it('pins a configured staging build through a stale production bootstrap and OAuth callback', () => {
    vi.stubEnv('VITE_BASE44_APP_ID', 'staging-app');
    vi.stubEnv('VITE_BASE44_APP_BASE_URL', 'https://staging.example');
    window.localStorage.setItem('app_id', productionAppId);
    window.localStorage.setItem('app_base_url', 'https://production.example');
    window.history.replaceState(null, '', '/?app_id=production&app_base_url=https://production.example');

    expect(getAppParams()).toMatchObject({ appId: 'staging-app', appBaseUrl: 'https://staging.example' });

    window.history.replaceState(null, '', '/?access_token=callback-token');
    expect(getAppParams()).toMatchObject({
      appId: 'staging-app', appBaseUrl: 'https://staging.example',
      serverUrl: 'https://staging.example', token: 'callback-token',
    });
    expect(window.location.search).toBe('');
  });

  it('restores the session saved by email login or OTP verification after a reload', () => {
    window.localStorage.setItem('base44_access_token', 'sdk-session');
    expect(getAppParams().token).toBe('sdk-session');
  });

  it('keeps legacy environment names and ignores a cached URL for explicitly configured apps', () => {
    vi.stubEnv('VITE_APP_ID', 'legacy-app');
    window.localStorage.setItem('app_base_url', 'https://production.example');

    expect(getAppParams()).toMatchObject({ appId: 'legacy-app', appBaseUrl: '' });
  });

  it('supports builder bootstrapping and the published app fallback on unconfigured builds', () => {
    window.history.replaceState(null, '', '/?app_id=builder-app&app_base_url=https://builder.example');
    expect(getAppParams()).toMatchObject({ appId: 'builder-app', appBaseUrl: 'https://builder.example', serverUrl: '' });

    window.history.replaceState(null, '', '/');
    expect(getAppParams().appId).toBe(productionAppId);
  });
});
