// @vitest-environment happy-dom
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Shared mutable mocks — vi.hoisted ensures they exist before the hoisted
// vi.mock factories run, so the test can reconfigure them per case.
const mocks = vi.hoisted(() => ({
  authService: {
    me: vi.fn(),
    getAppPublicSettings: vi.fn(),
    logout: vi.fn(),
    redirectToLogin: vi.fn(),
  },
  appParams: {
    appId: 'test-app',
    token: null, // mutated per test to simulate authenticated vs anonymous
    fromUrl: '/',
    functionsVersion: '',
    appBaseUrl: '',
  },
}));

// AuthContext now resolves auth through the service layer (useServices()).
// Mock the provider's hook so AuthProvider gets the contract mock without a
// real ServiceProvider, and keep a passthrough ServiceProvider for completeness.
vi.mock('@/services/providers/ServiceContext', () => ({
  useServices: () => ({ authService: mocks.authService }),
  ServiceProvider: ({ children }) => children,
}));
vi.mock('@/lib/app-params', () => ({ appParams: mocks.appParams }));

import { AuthProvider, useAuth } from '../AuthContext';

describe('AuthContext', () => {
  beforeEach(() => {
    mocks.authService.me.mockReset();
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
    expect(mocks.authService.me).not.toHaveBeenCalled();
  });

  it('loads the authenticated user when a token is present', async () => {
    mocks.appParams.token = 'fake-token';
    mocks.authService.me.mockResolvedValue({ id: 'u1', name: 'Test User' });
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.authChecked).toBe(true));

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual({ id: 'u1', name: 'Test User' });
    expect(mocks.authService.me).toHaveBeenCalledTimes(1);
  });
});