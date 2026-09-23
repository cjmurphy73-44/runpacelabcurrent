// @vitest-environment happy-dom
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Shared mutable mocks — vi.hoisted ensures they exist before the hoisted
// vi.mock factory runs, so the test can reconfigure them per case.
const mocks = vi.hoisted(() => ({
  authService: {
    getMe: vi.fn(),
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

// AuthContext imports the flat authService module (platform-managed file cannot
// be refactored to the service layer). Mock that module directly.
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

  it('loads the authenticated user when a token is present', async () => {
    mocks.appParams.token = 'fake-token';
    mocks.authService.getMe.mockResolvedValue({ id: 'u1', name: 'Test User' });
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.authChecked).toBe(true));

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual({ id: 'u1', name: 'Test User' });
    expect(mocks.authService.getMe).toHaveBeenCalledTimes(1);
  });
});