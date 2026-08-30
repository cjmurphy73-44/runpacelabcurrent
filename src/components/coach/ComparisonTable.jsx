import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Gauge, HeartPulse, Zap } from "lucide-react";

const fmt = (n, d = 0) => (typeof n === "number" && isFinite(n) ? n.toFixed(d) : "—");

const COLS = [
  { key: "ctl", label: "CTL", icon: Activity, get: (p) => fmt(p?.current_ctl, 1) },
  { key: "atl", label: "ATL", icon: Gauge, get: (p) => fmt(p?.current_atl, 1) },
  { key: "tsb", label: "TSB", icon: HeartPulse, get: (p) => fmt(p?.current_tsb, 1) },
  { key: "vdot", label: "VDOT", icon: Zap, get: (p) => fmt(p?.vdot_estimate, 1) },
];

export default function ComparisonTable({ athletes }) {
  if (athletes.length === 0) return null;
  const maxCTL = Math.max(...athletes.map((a) => a.profile?.current_ctl ?? 0), 1);

  if (athletes.length < 2) {
    return <p className="text-sm text-muted-foreground">Select two or more athletes to compare.</p>;
  }
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Side-by-side comparison</CardTitle></CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left font-medium text-muted-foreground px-4 py-2">Athlete</th>
                {COLS.map((c) => (
                  <th key={c.key} className="text-right font-medium text-muted-foreground px-4 py-2">{c.label}</th>
                ))}
                <th className="text-right font-medium text-muted-foreground px-4 py-2">Tier</th>
              </tr>
            </thead>
            <tbody>
              {athletes.map((a) => (
                <tr key={a.profile?.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-2 font-medium">{a.profile?.first_name} {a.profile?.last_name}</td>
                  {COLS.map((c) => (
                    <td key={c.key} className="px-4 py-2 text-right font-mono tabular-nums">{c.get(a.profile)}</td>
                  ))}
                  <td className="px-4 py-2 text-right capitalize text-xs">{a.profile?.training_tier_preference ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Relative fitness (CTL)</p>
          <div className="space-y-1.5">
            {athletes.map((a) => (
              <div key={a.profile?.id} className="flex items-center gap-2">
                <span className="text-xs w-24 truncate">{a.profile?.first_name} {a.profile?.last_name}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${Math.min(100, ((a.profile?.current_ctl ?? 0) / maxCTL) * 100)}%` }} />
                </div>
                <span className="text-xs font-mono tabular-nums w-10 text-right">{fmt(a.profile?.current_ctl, 1)}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}