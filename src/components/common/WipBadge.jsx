import React from "react";
import { FlaskConical } from "lucide-react";

// Reusable experimental/WIP pill. Pass `label` to override the default "Lab Preview"
// text (e.g. "Coming Soon", "Beta", "Setup required") and `icon` for an alternate glyph.
export default function WipBadge({ label = "Lab Preview", icon: Icon = FlaskConical, className = "" }) {
  return (
    <div
      className={`no-touch inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/20 border border-accent/40 text-[10px] uppercase tracking-wider font-semibold text-accent ${className}`}
    >
      <Icon className="w-3 h-3" />
      <span>{label}</span>
    </div>
  );
}