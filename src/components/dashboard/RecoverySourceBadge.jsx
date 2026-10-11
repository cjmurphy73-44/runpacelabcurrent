import React from "react";
import { Badge } from "@/components/ui/badge";
import { Watch, HeartPulse, Activity } from "lucide-react";

const SOURCES = {
  garmin: { label: "Garmin", icon: Watch, className: "bg-primary/10 text-primary border-primary/30" },
  coros: { label: "COROS", icon: Watch, className: "bg-success/10 text-success border-success/30" },
  suunto: { label: "Suunto", icon: Watch, className: "bg-primary/10 text-primary border-primary/30" },
  apple: { label: "Apple", icon: HeartPulse, className: "bg-danger/10 text-danger border-danger/30" },
  polar: { label: "Polar", icon: HeartPulse, className: "bg-danger/10 text-danger border-danger/30" },
  samsung: { label: "Samsung", icon: Watch, className: "bg-accent text-accent-foreground border-border" },
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