import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useUIPreferences } from "@/context/UIPreferencesContext";

function clampPct(value, max) {
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

function tsbDescriptor(tsb) {
  if (tsb > 15) return "Fresh & Peaked";
  if (tsb > -10) return "Balanced";
  if (tsb > -25) return "Building Fatigue";
  return "High Fatigue";
}

function ctlDescriptor(ctl) {
  if (ctl > 70) return "Strong base";
  if (ctl > 35) return "Building";
  return "Early stage";
}

function atlDescriptor(atl, ctl) {
  if (atl > ctl * 1.3) return "High";
  if (atl > ctl * 0.9) return "Moderate";
  return "Low";
}

export default function StatusGauges({ athlete }) {
  const { showDeepMetrics } = useUIPreferences();

  if (!athlete) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground font-heading uppercase tracking-wide">Readiness Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No metrics available yet.</p>
        </CardContent>
      </Card>
    );
  }

  const ctl = athlete.current_ctl || 0;
  const atl = athlete.current_atl || 0;
  const tsb = athlete.current_tsb || 0;

  const rows = [
    {
      geekLabel: "Fitness (CTL)",
      consumerLabel: "Running Capacity",
      value: Math.round(ctl),
      pct: clampPct(ctl, 100),
      descriptor: ctlDescriptor(ctl),
    },
    {
      geekLabel: "Fatigue (ATL)",
      consumerLabel: "Current Fatigue",
      value: Math.round(atl),
      pct: clampPct(atl, 100),
      descriptor: atlDescriptor(atl, ctl),
    },
    {
      geekLabel: "Form (TSB)",
      consumerLabel: "Recovery Balance",
      value: Math.round(tsb),
      pct: clampPct(tsb + 30, 60),
      descriptor: tsbDescriptor(tsb),
    },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground font-heading uppercase tracking-wide">Readiness Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((row) => (
          <div key={row.geekLabel} className="space-y-1.5">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">{showDeepMetrics ? row.geekLabel : row.consumerLabel}</span>
              <span className="text-muted-foreground text-xs">
                {showDeepMetrics ? row.value : row.descriptor}
              </span>
            </div>
            <Progress value={row.pct} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}