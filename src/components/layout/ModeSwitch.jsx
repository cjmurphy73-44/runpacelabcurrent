import React from "react";
import { Microscope, Gauge } from "lucide-react";
import { useUIPreferences } from "@/context/UIPreferencesContext";
import { cn } from "@/lib/utils";

// The single Standard / Geek switch. Standard = plain-language summaries.
// Geek = full terminology, formulas and the advanced deep-dive sections.
export default function ModeSwitch({ className = "", fullWidth = false }) {
  const { lens, setLens } = useUIPreferences();
  const base = "flex items-center justify-center gap-1.5 px-2.5 h-8 rounded-[5px] text-xs font-medium transition-colors";
  return (
    <div
      role="group"
      aria-label="Display mode"
      title="Standard shows plain-language summaries. Geek adds full terminology, formulas and advanced metrics."
      className={cn("flex items-center rounded-md border border-border p-0.5", className)}
    >
      <button
        type="button"
        onClick={() => setLens("simplified")}
        aria-pressed={lens === "simplified"}
        className={cn(base, fullWidth && "flex-1 h-9", lens === "simplified" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
      >
        <Gauge className="w-3.5 h-3.5" /> Standard
      </button>
      <button
        type="button"
        onClick={() => setLens("scientific")}
        aria-pressed={lens === "scientific"}
        className={cn(base, fullWidth && "flex-1 h-9", lens === "scientific" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
      >
        <Microscope className="w-3.5 h-3.5" /> Geek
      </button>
    </div>
  );
}