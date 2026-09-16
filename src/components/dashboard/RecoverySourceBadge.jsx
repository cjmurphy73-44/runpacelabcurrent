import React from "react";
import { Badge } from "@/components/ui/badge";
import { Watch, HeartPulse, Activity } from "lucide-react";

const SOURCES = {
  garmin: { label: "Garmin", icon: Watch, className: "bg-blue-50 text-blue-700 border-blue-200" },
  coros: { label: "COROS", icon: Watch, className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  suunto: { label: "Suunto", icon: Watch, className: "bg-sky-50 text-sky-700 border-sky-200" },
  apple: { label: "Apple", icon: HeartPulse, className: "bg-rose-50 text-rose-700 border-rose-200" },
  polar: { label: "Polar", icon: HeartPulse, className: "bg-red-50 text-red-700 border-red-200" },
  samsung: { label: "Samsung", icon: Watch, className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  manual: { label: "Manual", icon: Activity, className: "bg-muted text-muted-foreground border-border" },
};

export default function RecoverySourceBadge({ source }) {
  if (!source) return null;
  const cfg = SOURCES[source] || { label: source, icon: Activity, className: "bg-muted text-muted-foreground border-border" };
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`gap-1 ${cfg.className}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  );
}