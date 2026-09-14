import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CoachChat from './pages/CoachChat';
import AppLayout from './components/layout/AppLayout';
import { Toaster } from './components/ui/toaster';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<CoachChat />} />
          <Route path="/coach" element={<CoachChat />} />
        </Route>
        <Route path="*" element={<CoachChat />} />
      </Routes>
      <Toaster />
    </Router>
  );
}
