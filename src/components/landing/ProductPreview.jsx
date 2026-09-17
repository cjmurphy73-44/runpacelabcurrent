import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from "recharts";
import { Activity, HeartPulse, Gauge } from "lucide-react";

const TREND = [
  { d: "W1", fitness: 28, fatigue: 22 },
  { d: "W2", fitness: 32, fatigue: 30 },
  { d: "W3", fitness: 36, fatigue: 27 },
  { d: "W4", fitness: 41, fatigue: 34 },
  { d: "W5", fitness: 45, fatigue: 31 },
  { d: "W6", fitness: 49, fatigue: 29 },
  { d: "W7", fitness: 54, fatigue: 33 },
  { d: "W8", fitness: 58, fatigue: 30 },
];

const STATS = [
  { label: "Fitness", value: "58", unit: "CTL", icon: Activity, tone: "text-primary" },
  { label: "Form", value: "+28", unit: "TSB", icon: Gauge, tone: "text-emerald-600" },
  { label: "Readiness", value: "82", unit: "/100", icon: HeartPulse, tone: "text-accent-foreground" },
];

export default function ProductPreview() {
  return (
    <div className="rounded-lg border border-border bg-card shadow-xl overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted/50">
        <span className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
        <span className="ml-3 text-xs text-muted-foreground font-mono">trainpacelab.base44.app/app</span>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Today</p>
            <p className="font-heading font-semibold text-lg">Tuesday — Quality session</p>
          </div>
          <Badge className="bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">Ready</Badge>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {STATS.map((s) => (
            <Card key={s.label} className="border-border">
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <s.icon className="w-3.5 h-3.5" />
                  <span className="text-[11px] uppercase tracking-wide">{s.label}</span>
                </div>
                <p className="mt-1.5 text-2xl font-bold font-heading">
                  {s.value} <span className="text-xs font-normal text-muted-foreground">{s.unit}</span>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="rounded-md border border-border p-3">
          <p className="text-xs text-muted-foreground mb-2">Fitness vs Fatigue — 8 weeks</p>
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TREND} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                <defs>
                  <linearGradient id="gFit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="d" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                <Area type="monotone" dataKey="fitness" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#gFit)" />
                <Area type="monotone" dataKey="fatigue" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} fill="none" strokeDasharray="3 3" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}