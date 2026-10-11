import React from "react";
import { Sun, Moon } from "lucide-react";
import { useUIPreferences } from "@/context/UIPreferencesContext";

// Light/dark switch. Shows the icon of the theme you will switch TO.
export default function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useUIPreferences();
  const isLight = theme === "light";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isLight ? "Switch to dark mode" : "Switch to light mode"}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      className={`flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground ${className}`}
    >
      {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
    </button>
  );
}