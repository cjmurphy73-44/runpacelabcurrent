import React from "react";

const ZONE_META = [
  { label: "Z1 Recovery", bar: "bg-zone-1" },
  { label: "Z2 Endurance", bar: "bg-zone-2" },
  { label: "Z3 Tempo", bar: "bg-zone-3" },
  { label: "Z4 Threshold", bar: "bg-zone-4" },
  { label: "Z5 Anaerobic", bar: "bg-zone-5" },
];

export default function HRZoneBreakdown({ zones }) {
  return (
    <div className="space-y-2">
      {ZONE_META.map((meta, i) => (
        <div key={meta.label} className="flex items-center gap-3">
          <span className="w-28 text-xs text-muted-foreground shrink-0">{meta.label}</span>
          <div className="flex-1 h-2.5 rounded-full bg-muted/50 overflow-hidden">
            <div
              className={`h-full ${meta.bar} rounded-full transition-all`}
              style={{ width: `${zones[i]?.pct || 0}%` }}
            />
          </div>
          <span className="w-10 text-right text-xs font-medium text-foreground">
            {Math.round(zones[i]?.pct || 0)}%
          </span>
        </div>
      ))}
    </div>
  );
}