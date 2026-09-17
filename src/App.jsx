import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CoachChat from '@/pages/CoachChat';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import RecoveryCenter from '@/pages/RecoveryCenter';
import RacePrediction from '@/pages/RacePrediction';
import Pbs from '@/pages/Pbs';
import Calendar from '@/pages/Calendar';
import TrainingKanban from '@/pages/TrainingKanban';
import Physiology from '@/pages/Physiology';
import Vdot from '@/pages/Vdot';
import WeatherAdjust from '@/pages/WeatherAdjust';
import Zones from '@/pages/Zones';
import AdvancedAnalytics from '@/pages/AdvancedAnalytics';
import TrainingPlan from '@/pages/TrainingPlan';
import AthleteSettings from '@/pages/AthleteSettings';
import Imports from '@/pages/Imports';
import Subscribe from '@/pages/Subscribe';
import CoachWorkspace from '@/pages/CoachWorkspace';
import Admin from '@/pages/Admin';
import UserGuide from '@/pages/UserGuide';
import AppLayout from '@/components/layout/AppLayout';
import PageNotFound from '@/lib/PageNotFound';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider } from '@/lib/AuthContext';
import { UIPreferencesProvider } from '@/context/UIPreferencesContext';
import { Toaster } from '@/components/ui/toaster';

export default function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        <UIPreferencesProvider>
          <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/coach" element={<CoachChat />} />
              <Route path="/recovery" element={<RecoveryCenter />} />
              <Route path="/predict" element={<RacePrediction />} />
              <Route path="/pbs" element={<Pbs />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/kanban" element={<TrainingKanban />} />
              <Route path="/physiology" element={<Physiology />} />
              <Route path="/vdot" element={<Vdot />} />
              <Route path="/weather" element={<WeatherAdjust />} />
              <Route path="/zones" element={<Zones />} />
              <Route path="/analytics" element={<AdvancedAnalytics />} />
              <Route path="/plan" element={<TrainingPlan />} />
              <Route path="/settings" element={<AthleteSettings />} />
              <Route path="/import" element={<Imports />} />
              <Route path="/subscribe" element={<Subscribe />} />
              <Route path="/roster" element={<CoachWorkspace />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/guide" element={<UserGuide />} />
              <Route path="*" element={<PageNotFound />} />
            </Route>
          </Routes>
          <Toaster />
        </Router>
        </UIPreferencesProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}