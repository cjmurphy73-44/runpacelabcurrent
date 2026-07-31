import React from "react";

const ZONE_STYLES = {
  1: { bar: "bg-zone-1", text: "text-zone-1", bg: "bg-zone-1/10" },
  2: { bar: "bg-zone-2", text: "text-zone-2", bg: "bg-zone-2/10" },
  3: { bar: "bg-zone-3", text: "text-zone-3", bg: "bg-zone-3/10" },
  4: { bar: "bg-zone-4", text: "text-zone-4", bg: "bg-zone-4/10" },
  5: { bar: "bg-zone-5", text: "text-zone-5", bg: "bg-zone-5/10" },
};

function extractZoneNumber(zone) {
  const match = /([1-5])/.exec(zone || "");
  return match ? Number(match[1]) : null;
}

export default function ZoneBadge({ zone, className = "" }) {
  if (!zone) return null;
  const num = extractZoneNumber(zone);
  const style = ZONE_STYLES[num] || { bar: "bg-muted-foreground", text: "text-muted-foreground", bg: "bg-muted" };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ${style.bg} ${style.text} ${className}`}>
      <span className={`w-1 h-3 rounded-full ${style.bar}`} />
      {zone}
    </span>
  );
}