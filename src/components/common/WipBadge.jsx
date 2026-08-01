import React from "react";
import { FlaskConical } from "lucide-react";

export default function WipBadge({ className = "" }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/20 border border-accent/40 text-[10px] uppercase tracking-wider font-semibold text-accent ${className}`}
    >
      <FlaskConical className="w-3 h-3" />
      <span>Lab Preview</span>
    </div>
  );
}