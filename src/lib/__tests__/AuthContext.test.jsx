// @vitest-environment happy-dom
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

beforeEach(() => {
  global.fetch = vi.fn().mockImplementation(() => 
    Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
  );
});

const mocks = vi.hoisted(() => ({
  authService: {
    getMe: vi.fn(),
    getAppPublicSettings: vi.fn(),
    logout: vi.fn(),
    redirectToLogin: vi.fn(),
  },
  appParams: {
    appId: 'test-app',
    token: null,
    fromUrl: '/',
    functionsVersion: '',
    appBaseUrl: '',
  },
}));

vi.mock('@/services/authService', () => ({ authService: mocks.authService }));
vi.mock('@/lib/app-params', () => ({ appParams: mocks.appParams }));

import { AuthProvider, useAuth } from '../AuthContext';

describe('AuthContext', () => {
  beforeEach(() => {
    mocks.authService.getMe.mockReset();
    mocks.authService.getAppPublicSettings.mockReset();
    mocks.authService.getAppPublicSettings.mockResolvedValue({ id: 'test-app', public_settings: {} });
    mocks.appParams.token = null;
  });

  it('loads public settings and stays unauthenticated when no token is present', async () => {
    mocks.appParams.token = null;
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.authChecked).toBe(true));

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(mocks.authService.getMe).not.toHaveBeenCalled();
  });

  it('loads and reconciles the authenticated user when a token is present', async () => {
    mocks.appParams.token = 'fake-token';
    const rawUser = { id: 'u1', name: 'Test User', email: 'Test@Gmail.com' };

    mocks.authService.getMe.mockResolvedValue(rawUser);

    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.authChecked).toBe(true));

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual({
      id: 'u1',
      name: 'Test User',
      email: 'Test@Gmail.com',
    });
    expect(mocks.authService.getMe).toHaveBeenCalledTimes(1);
  });
});
