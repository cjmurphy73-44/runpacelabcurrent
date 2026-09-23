import React from "react";
import { AlertTriangle, Sparkles, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAnomalyAlerts } from "@/hooks/useAnomalyAlerts";

const SEV_STYLE = {
  danger: {
    icon: ShieldAlert,
    wrap: "border-destructive/40 bg-destructive/5",
    iconWrap: "bg-destructive/10 text-destructive",
    chip: "bg-destructive/10 text-destructive",
    label: "Alert",
  },
  warning: {
    icon: AlertTriangle,
    wrap: "border-amber-500/40 bg-amber-50/60",
    iconWrap: "bg-amber-500/15 text-amber-600",
    chip: "bg-amber-500/15 text-amber-700",
    label: "Watch",
  },
  positive: {
    icon: Sparkles,
    wrap: "border-emerald-500/40 bg-emerald-50/60",
    iconWrap: "bg-emerald-500/15 text-emerald-600",
    chip: "bg-emerald-500/15 text-emerald-700",
    label: "Win",
  },
};

function AlertRow({ alert }) {
  const s = SEV_STYLE[alert.severity] ?? SEV_STYLE.warning;
  const Icon = s.icon;
  return (
    <div className={`flex gap-3 rounded-lg border px-4 py-3 ${s.wrap}`}>
      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${s.iconWrap}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${s.chip}`}>
            {s.label}
          </span>
          <span className="text-sm font-heading font-semibold">{alert.title}</span>
        </div>
        <p className="text-sm text-muted-foreground">{alert.detail}</p>
        {alert.cue && (
          <p className="text-sm text-foreground">
            <span className="font-medium">Coach cue: </span>
            {alert.cue}
          </p>
        )}
      </div>
    </div>
  );
}

// Proactive AI coaching banner: surfaces anomaly + momentum signals detected by
// useAnomalyAlerts directly at the top of the dashboard, so intelligent cues are
// part of the main experience rather than buried in an isolated report.
export default function AnomalyAlertBanner() {
  const { alerts, loading } = useAnomalyAlerts();

  if (loading || alerts.length === 0) return null;

  // Danger first, then warnings, then positives.
  const order = { danger: 0, warning: 1, positive: 2 };
  const sorted = [...alerts].sort((a, b) => order[a.severity] - order[b.severity]);

  return (
    <Card className="border-border shadow-sm">
      <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-2.5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-heading font-semibold">Coaching cues</h3>
          <span className="text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded border border-border text-muted-foreground">
            AI
          </span>
        </div>
        <div className="space-y-2">
          {sorted.map((a) => (
            <AlertRow key={a.id} alert={a} />
          ))}
        </div>
      </div>
    </Card>
  );
}