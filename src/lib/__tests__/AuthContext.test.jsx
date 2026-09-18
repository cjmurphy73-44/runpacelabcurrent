// @vitest-environment happy-dom
import { renderHook, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { authService } from '@/services/authService';
import { vi } from 'vitest';

// Mock the authService
vi.mock('@/services/authService', () => ({
  authService: {
    getAppPublicSettings: vi.fn().mockResolvedValue({ name: 'Test App' }),
    getMe: vi.fn().mockResolvedValue({ id: 1, name: 'Test User' }),
  },
}));

describe('AuthContext', () => {
  it('should initialize and load user', async () => {
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isLoadingAuth).toBe(true);

    await waitFor(() => expect(result.current.authChecked).toBe(true));

    expect(result.current.user.name).toBe('Test User');
    expect(result.current.isAuthenticated).toBe(true);
  });
});
