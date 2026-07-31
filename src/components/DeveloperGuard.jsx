import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Navigate } from 'react-router-dom';

// Simple guard: Replace with your actual user ID or a role check from AuthContext
const DEVELOPER_IDS = ['YOUR_USER_ID_HERE']; 

export default function DeveloperGuard({ children }) {
  const { user } = useAuth();
  
  if (!user || !DEVELOPER_IDS.includes(user.id)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
