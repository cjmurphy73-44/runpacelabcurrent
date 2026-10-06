import React, { createContext, useContext, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { authService } from '@/services/authService';
import { appParams } from '@/lib/app-params';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      if (!appParams.token) {
        setAuthChecked(true);
        return;
      }

      try {
        const rawUser = await authService.getMe();
        
        if (!rawUser) {
          setUser(null);
          setIsAuthenticated(false);
        } else {
          // Use the real Base44 user as-is. A previous reconciliation step
          // replaced the user id with the OAuth provider id, which caused
          // "Invalid id value -> Object not found" on downstream reads
          // (AthleteProfile.filter({ created_by_id: user.id }), etc.).
          setUser(rawUser);
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.error('Authentication initialization failed:', err);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setAuthChecked(true);
      }
    };

    initializeAuth();
  }, []);

  const value = {
    user,
    isAuthenticated,
    authChecked,
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