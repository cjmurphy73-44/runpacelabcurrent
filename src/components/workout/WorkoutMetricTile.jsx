import React from "react";

// `hint` carries provenance ("measured" / "estimated") so a value is never shown
// as if every number on the row came from the watch.
export default function WorkoutMetricTile({ label, value, hint }) {
  return (
    <div className="rounded-lg bg-muted/40 p-2">
      <p className="text-xs text-muted-foreground">
        {label}
        {hint && (
          <span className="ml-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">
            · {hint}
          </span>
        )}
      </p>
      <p className="font-semibold text-foreground">{value}</p>
    </div>
  );
}