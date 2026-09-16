import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CoachChat from '@/pages/CoachChat';
import Home from '@/pages/Home';
import RecoveryCenter from '@/pages/RecoveryCenter';
import AppLayout from '@/components/layout/AppLayout';
import { AuthProvider } from '@/lib/AuthContext';
import { UIPreferencesProvider } from '@/context/UIPreferencesContext';
import { Toaster } from '@/components/ui/toaster';

export default function App() {
  return (
    <AuthProvider>
      <UIPreferencesProvider>
        <Router>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/coach" element={<CoachChat />} />
              <Route path="/recovery" element={<RecoveryCenter />} />
            </Route>
            <Route path="*" element={<CoachChat />} />
          </Routes>
          <Toaster />
        </Router>
      </UIPreferencesProvider>
    </AuthProvider>
  );
}