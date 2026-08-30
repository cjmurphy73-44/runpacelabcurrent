import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Activity, HeartPulse, Gauge, CalendarClock, Trash2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const fmt = (n, d = 0) => (typeof n === "number" && isFinite(n) ? n.toFixed(d) : "—");
const tsbTone = (tsb) =>
  tsb == null ? "text-muted-foreground" : tsb > 15 ? "text-emerald-600" : tsb < -15 ? "text-rose-600" : "text-foreground";
const weekVolume = (workouts = []) => {
  const cutoff = Date.now() - 7 * 86400000;
  return workouts.filter((w) => new Date(w.date).getTime() >= cutoff).reduce((s, w) => s + (w.duration_minutes || 0), 0);
};

export default function RosterCard({ assignment, profile, workouts, plan, selected, onToggleCompare, onRemove }) {
  const name = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || assignment.athlete_name_snapshot || "Unnamed athlete";
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <Checkbox checked={selected} onCheckedChange={onToggleCompare} className="mt-1" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm truncate">{name}</p>
                <Badge variant="outline" className="capitalize text-[10px]">{profile?.training_tier_preference ?? "—"}</Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {plan ? `Plan: ${plan.plan_title ?? "Active"}` : "No active plan"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Link to={`/activity/${workouts?.[0]?.id ?? ""}`} className="text-muted-foreground hover:text-primary" title="Latest session">
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button onClick={onRemove} className="text-muted-foreground hover:text-rose-600 p-1" title="Remove from roster">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
          <Metric icon={Activity} label="CTL" value={fmt(profile?.current_ctl, 1)} />
          <Metric icon={Gauge} label="ATL" value={fmt(profile?.current_atl, 1)} />
          <Metric icon={HeartPulse} label="TSB" value={fmt(profile?.current_tsb, 1)} valueClass={tsbTone(profile?.current_tsb)} />
          <Metric icon={CalendarClock} label="7d min" value={Math.round(weekVolume(workouts))} />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
          <Stat label="VDOT" value={fmt(profile?.vdot_estimate, 1)} />
          <Stat label="Last sync" value={profile?.last_data_sync ? new Date(profile.last_data_sync).toLocaleDateString() : "Never"} />
        </div>
      </CardContent>
    </Card>
  );
}

const Metric = ({ icon: Icon, label, value, valueClass = "text-foreground" }) => (
  <div className="flex flex-col rounded-md bg-muted/50 px-2 py-1.5">
    <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Icon className="w-3 h-3" />{label}</span>
    <span className={`font-mono tabular-nums text-sm font-semibold ${valueClass}`}>{value}</span>
  </div>
);
const Stat = ({ label, value }) => (
  <div className="flex items-center justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-mono tabular-nums">{value}</span>
  </div>
);