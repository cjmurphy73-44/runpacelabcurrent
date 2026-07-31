import React from "react";
import { Navigate } from "react-router-dom";

// Simple hardcoded check for the developer. 
// In production, this would look at a user session role.
const DEVELOPER_ID = "connor_admin"; // Placeholder

export default function DeveloperGuard({ children }) {
  // Replace this with your actual auth context logic
  const isAuthenticatedDeveloper = localStorage.getItem("user_id") === DEVELOPER_ID;

  if (!isAuthenticatedDeveloper) {
    return <Navigate to="/" replace />;
  }

  return children;
}
