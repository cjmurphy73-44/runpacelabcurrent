import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const UIPreferencesContext = createContext(null);
const STORAGE_KEY = "showDeepMetrics";

export function UIPreferencesProvider({ children }) {
  const [showDeepMetrics, setShowDeepMetrics] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(showDeepMetrics));
  }, [showDeepMetrics]);

  const toggleDeepMetrics = useCallback(() => setShowDeepMetrics((v) => !v), []);

  return (
    <UIPreferencesContext.Provider value={{ showDeepMetrics, setShowDeepMetrics, toggleDeepMetrics }}>
      {children}
    </UIPreferencesContext.Provider>
  );
}

export function useUIPreferences() {
  return useContext(UIPreferencesContext);
}