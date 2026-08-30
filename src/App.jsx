import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { UIPreferencesProvider } from '@/context/UIPreferencesContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import AppLayout from '@/components/layout/AppLayout';
import Home from '@/pages/Home';
import CoachChat from '@/pages/CoachChat';
import TrainingPlan from '@/pages/TrainingPlan';
import DevTracker from '@/pages/DevTracker';
import DeveloperGuard from '@/components/auth/DeveloperGuard';
import AthleteSettings from '@/pages/AthleteSettings';
import Imports from '@/pages/Imports';
import Vdot from '@/pages/Vdot';
import WeatherAdjust from '@/pages/WeatherAdjust';
import Zones from '@/pages/Zones';
import Pbs from '@/pages/Pbs';
import Calendar from '@/pages/Calendar';
import Physiology from '@/pages/Physiology';
import RecoveryCenter from '@/pages/RecoveryCenter';
import ActivityDetail from '@/pages/ActivityDetail';
import { IntelligenceHub } from './components/IntelligenceHub';
import PageErrorBoundary from '@/components/common/PageErrorBoundary';
import RacePrediction from '@/pages/RacePrediction';
import CoachWorkspace from '@/pages/CoachWorkspace';
import Subscribe from '@/pages/Subscribe';
import AdvancedAnalytics from '@/pages/AdvancedAnalytics';
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      {/* Add your page Route elements here */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<PageErrorBoundary><Home /></PageErrorBoundary>} />
          <Route path="/intelligence" element={<PageErrorBoundary><IntelligenceHub /></PageErrorBoundary>} />
          <Route path="/coach" element={<PageErrorBoundary><CoachChat /></PageErrorBoundary>} />
          <Route path="/plan" element={<PageErrorBoundary><TrainingPlan /></PageErrorBoundary>} />
          <Route path="/dev-tracker" element={<DeveloperGuard><DevTracker /></DeveloperGuard>} />
          <Route path="/settings" element={<PageErrorBoundary><AthleteSettings /></PageErrorBoundary>} />
          <Route path="/import" element={<PageErrorBoundary><Imports /></PageErrorBoundary>} />
          <Route path="/vdot" element={<Vdot />} />
          <Route path="/weather" element={<WeatherAdjust />} />
          <Route path="/zones" element={<Zones />} />
          <Route path="/pbs" element={<Pbs />} />
          <Route path="/calendar" element={<PageErrorBoundary><Calendar /></PageErrorBoundary>} />
          <Route path="/physiology" element={<PageErrorBoundary><Physiology /></PageErrorBoundary>} />
          <Route path="/recovery" element={<PageErrorBoundary><RecoveryCenter /></PageErrorBoundary>} />
          <Route path="/activity/:id" element={<PageErrorBoundary><ActivityDetail /></PageErrorBoundary>} />
          <Route path="/predict" element={<PageErrorBoundary><RacePrediction /></PageErrorBoundary>} />
          <Route path="/analytics" element={<PageErrorBoundary><AdvancedAnalytics /></PageErrorBoundary>} />
          <Route path="/roster" element={<PageErrorBoundary><CoachWorkspace /></PageErrorBoundary>} />
          <Route path="/subscribe" element={<PageErrorBoundary><Subscribe /></PageErrorBoundary>} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <UIPreferencesProvider>
          <Router>
            <ScrollToTop />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </UIPreferencesProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App