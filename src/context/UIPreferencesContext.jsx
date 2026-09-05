import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const UIPreferencesContext = createContext(null);
const STORAGE_KEY = "showDeepMetrics";
const LENS_KEY = "analyticsLens"; // "scientific" | "simplified"

export function UIPreferencesProvider({ children }) {
  const [showDeepMetrics, setShowDeepMetrics] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  });
  const [lens, setLensState] = useState(() => {
    if (typeof window === "undefined") return "scientific";
    return window.localStorage.getItem(LENS_KEY) === "simplified" ? "simplified" : "scientific";
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(showDeepMetrics));
  }, [showDeepMetrics]);
  useEffect(() => {
    window.localStorage.setItem(LENS_KEY, lens);
  }, [lens]);

  const toggleDeepMetrics = useCallback(() => setShowDeepMetrics((v) => !v), []);
  const setLens = useCallback((v) => setLensState(v), []);
  const toggleLens = useCallback(
    () => setLensState((v) => (v === "scientific" ? "simplified" : "scientific")),
    []
  );

  return (
    <UIPreferencesContext.Provider
      value={{
        showDeepMetrics,
        setShowDeepMetrics,
        toggleDeepMetrics,
        lens,
        setLens,
        toggleLens,
      }}
    >
      {children}
    </UIPreferencesContext.Provider>
  );
}

export function useUIPreferences() {
  return useContext(UIPreferencesContext);
}