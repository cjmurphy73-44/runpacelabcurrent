import React, { lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Landing from '@/pages/Landing';
import Terms from '@/pages/Terms';
import Privacy from '@/pages/Privacy';
import Refund from '@/pages/Refund';
import Support from '@/pages/Support';
import CheckoutSuccess from '@/pages/CheckoutSuccess';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import PageNotFound from '@/lib/PageNotFound';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider } from '@/lib/AuthContext';
import { UIPreferencesProvider } from '@/context/UIPreferencesContext';
import { ServiceProvider } from '@/services/providers/ServiceContext';
import { Toaster } from '@/components/ui/toaster';

// In-app pages load on demand so the first visit downloads far less code.
const CoachChat = lazy(() => import('@/pages/CoachChat'));
const Home = lazy(() => import('@/pages/Home'));
const RecoveryCenter = lazy(() => import('@/pages/RecoveryCenter'));
const RacePrediction = lazy(() => import('@/pages/RacePrediction'));
const Pbs = lazy(() => import('@/pages/Pbs'));
const Calendar = lazy(() => import('@/pages/Calendar'));
const TrainingKanban = lazy(() => import('@/pages/TrainingKanban'));
const Physiology = lazy(() => import('@/pages/Physiology'));
const Vdot = lazy(() => import('@/pages/Vdot'));
const WeatherAdjust = lazy(() => import('@/pages/WeatherAdjust'));
const Zones = lazy(() => import('@/pages/Zones'));
const AdvancedAnalytics = lazy(() => import('@/pages/AdvancedAnalytics'));
const Workouts = lazy(() => import('@/pages/Workouts'));
const TrainingPlan = lazy(() => import('@/pages/TrainingPlan'));
const AthleteSettings = lazy(() => import('@/pages/AthleteSettings'));
const Imports = lazy(() => import('@/pages/Imports'));
const Subscribe = lazy(() => import('@/pages/Subscribe'));
const CoachWorkspace = lazy(() => import('@/pages/CoachWorkspace'));
const Admin = lazy(() => import('@/pages/Admin'));
const Operations = lazy(() => import('@/pages/Operations'));
const UserGuide = lazy(() => import('@/pages/UserGuide'));


export default function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <ServiceProvider>
        <AuthProvider>
        <UIPreferencesProvider>
          <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/landing" element={<Navigate to="/" replace />} />
            <Route path="/" element={<Landing />} />
            <Route path="/support" element={<Support />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/refund" element={<Refund />} />
            <Route path="/welcome" element={<CheckoutSuccess />} />
            <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
              <Route element={<AppLayout />}>
                <Route path="/app" element={<Home />} />
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
              <Route path="/workouts" element={<Workouts />} />
              <Route path="/plan" element={<TrainingPlan />} />
              <Route path="/settings" element={<AthleteSettings />} />
              <Route path="/import" element={<Imports />} />
              <Route path="/subscribe" element={<Subscribe />} />
              <Route path="/roster" element={<CoachWorkspace />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/operations" element={<Operations />} />
              <Route path="/guide" element={<UserGuide />} />
              <Route path="*" element={<PageNotFound />} />
              </Route>
            </Route>
          </Routes>
          <Toaster />
        </Router>
        </UIPreferencesProvider>
        </AuthProvider>
      </ServiceProvider>
    </QueryClientProvider>
  );
}