import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { authService } from '@/services/authService';
import { appParams } from '@/lib/app-params';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Resolves the current session from the Base44 SDK. Auto-runs on mount so the
  // first protected screen doesn't need to trigger it manually. Exposed as
  // `checkUserAuth` so components (e.g. ProtectedRoute) can re-check after a
  // token refresh or a manual retry.
  const checkUserAuth = useCallback(async () => {
    if (!appParams.token) {
      setUser(null);
      setIsAuthenticated(false);
      setAuthChecked(true);
      setIsLoadingAuth(false);
      setAuthError(null);
      return;
    }
    setIsLoadingAuth(true);
    try {
      const rawUser = await authService.getMe();
      if (!rawUser) {
        setUser(null);
        setIsAuthenticated(false);
        setAuthError(null);
      } else {
        // Use the real Base44 user as-is. A previous reconciliation step
        // replaced the user id with the OAuth provider id, which caused
        // "Invalid id value -> Object not found" on downstream reads
        // (AthleteProfile.filter({ created_by_id: user.id }), etc.).
        setUser(rawUser);
        setIsAuthenticated(true);
        setAuthError(null);
      }
    } catch (err) {
      console.error('Authentication initialization failed:', err);
      setUser(null);
      setIsAuthenticated(false);
      // Distinguish "user not registered" (no profile yet — show onboarding)
      // from a real auth/network failure (treat as unauthenticated).
      const msg = err?.message || String(err || '');
      const isNotRegistered =
        err?.error_type === 'user_not_registered' ||
        err?.code === 'user_not_registered' ||
        /not registered/i.test(msg);
      setAuthError(isNotRegistered ? { type: 'user_not_registered', message: msg, ...err } : (err || { message: 'Authentication failed' }));
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    checkUserAuth();
  }, [checkUserAuth]);

  const value = {
    user,
    isAuthenticated,
    authChecked,
    isLoadingAuth,
    authError,
    checkUserAuth,
    logout: () => authService.logout(),
    redirectToLogin: () => authService.redirectToLogin(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};