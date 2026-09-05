import React from "react";
import { useUIPreferences } from "@/context/UIPreferencesContext";
import { termLabel } from "@/lib/terminology";

// Renders a metric label in the current lens (Scientific vs Simplified).
// Usage: <LensLabel k="acwr" />  →  "ACWR" or "Load Balance"
export function LensLabel({ k, fallback }) {
  const { lens } = useUIPreferences();
  const label = termLabel(k, lens);
  return <>{label || fallback || k}</>;
}

export default LensLabel;