import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '@/services/authService';
import { findOrCreateUserByOAuth } from '@/services/authReconciliationService';
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
          // Reconcile user to normalize email casing and ensure provider linking
          const reconciledUser = await findOrCreateUserByOAuth({
            email: rawUser.email,
            name: rawUser.name,
            providerId: rawUser.provider_id || rawUser.id,
            provider: rawUser.provider || 'google'
          });

          setUser(reconciledUser);
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
