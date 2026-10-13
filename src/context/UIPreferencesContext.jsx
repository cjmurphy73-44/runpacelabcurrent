import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const UIPreferencesContext = createContext(null);
const LENS_KEY = "analyticsLens"; // "scientific" (Geek) | "simplified" (Standard)
const THEME_KEY = "appTheme"; // "dark" | "light"

export function UIPreferencesProvider({ children }) {
  const [lens, setLensState] = useState(() => {
    if (typeof window === "undefined") return "simplified";
    const stored = window.localStorage.getItem(LENS_KEY);
    if (stored === "scientific" || stored === "simplified") return stored;
    // Migrate the retired separate "deep metrics" flag so existing geek users keep their choice.
    return window.localStorage.getItem("showDeepMetrics") === "true" ? "scientific" : "simplified";
  });

  const [theme, setThemeState] = useState(() => {
    if (typeof window === "undefined") return "dark";
    return window.localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  });

  useEffect(() => {
    window.localStorage.setItem(LENS_KEY, lens);
  }, [lens]);

  useEffect(() => {
    window.localStorage.setItem(THEME_KEY, theme);
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
    } else {
      root.classList.add("dark");
      root.classList.remove("light");
    }
  }, [theme]);

  const setLens = useCallback((v) => setLensState(v), []);
  const toggleLens = useCallback(
    () => setLensState((v) => (v === "scientific" ? "simplified" : "scientific")),
    []
  );
  const toggleTheme = useCallback(
    () => setThemeState((prev) => (prev === "light" ? "dark" : "light")),
    []
  );

  // One switch: Geek mode (lens "scientific") is the only source of truth.
  // showDeepMetrics / toggleDeepMetrics are kept as derived aliases so existing consumers keep working.
  const showDeepMetrics = lens === "scientific";

  return (
    <UIPreferencesContext.Provider
      value={{
        lens,
        setLens,
        toggleLens,
        isGeek: showDeepMetrics,
        showDeepMetrics,
        toggleDeepMetrics: toggleLens,
        theme,
        toggleTheme,
      }}
    >
      {children}
    </UIPreferencesContext.Provider>
  );
}

export function useUIPreferences() {
  return useContext(UIPreferencesContext);
}