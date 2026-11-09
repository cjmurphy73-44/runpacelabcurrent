import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Watch, Upload, Plus, ArrowRight, CheckCircle2, Circle, RefreshCw,
  Activity, HeartPulse, Gauge, Flag,
} from "lucide-react";
import WearableSyncBar from "@/components/dashboard/WearableSyncBar";
import WearableSyncGuide from "@/components/dashboard/WearableSyncGuide";

function formatPace(mps) {
  if (!mps || mps <= 0) return null;
  const secPerKm = 1000 / mps;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className="text-base font-heading font-semibold tabular-nums">{value ?? "—"}</div>
    </div>
  );
}

// The screen a brand-new athlete sees after creating their profile: what we
// already know, the three honest ways to get data in, and what has actually
// arrived. Nothing is implied as "done" until a record exists.
export default function FirstDataPanel({ athlete, onAddManual, onRefresh }) {
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [workouts, recoveryDays, latest] = await Promise.all([
        base44.entities.WorkoutSession.count({ athlete_id: athlete.id }),
        base44.entities.DailyMetrics.count({ athlete_id: athlete.id }),
        base44.entities.WorkoutSession.filter({ athlete_id: athlete.id }, "-date", 1),
      ]);
      setCounts({
        workouts,
        recoveryDays,
        lastDate: Array.isArray(latest) ? latest[0]?.date || null : null,
      });
    } catch (err) {
      console.warn("First-data counts failed:", err);
      setCounts(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [athlete.id]);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    onRefresh?.();
  };

  const wearables = athlete?.primary_wearables ?? [];
  const name = athlete?.first_name ? `, ${athlete.first_name}` : "";
  const hasWorkouts = (counts?.workouts || 0) > 0;
  const hasRecovery = (counts?.recoveryDays || 0) > 0;

  return (
    <div className="space-y-6">
      <Card className="border-dashed border-2 shadow-none">
        <CardContent className="pt-7 pb-7 space-y-5">
          <div className="space-y-1.5">
            <h2 className="text-xl font-heading font-bold">You're set up{name}.</h2>
            <p className="text-sm text-muted-foreground">
              We've built a starting model of your fitness. One workout is all it takes to switch the
              dashboard on, pick whichever way of getting data in suits you.
            </p>
          </div>

          {/* What we already know, with its source stated plainly. */}
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm font-medium flex items-center gap-2">
                <Gauge className="w-4 h-4 text-primary" /> What we already know
              </p>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground border border-border rounded px-1.5 py-0.5">
                Estimated, not measured
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Metric icon={Gauge} label="VDOT" value={athlete?.vdot_estimate ? Number(athlete.vdot_estimate).toFixed(1) : null} />
              <Metric icon={Activity} label="Threshold pace" value={formatPace(athlete?.functional_threshold_pace_ms)} />
              <Metric icon={HeartPulse} label="Max HR" value={athlete?.max_heart_rate ? `${athlete.max_heart_rate} bpm` : null} />
              <Metric icon={HeartPulse} label="Resting HR" value={athlete?.resting_hr ? `${athlete.resting_hr} bpm` : null} />
            </div>
            <p className="text-xs text-muted-foreground">
              Derived from the effort you entered. Log a race or a threshold run and these become measured.
            </p>
          </div>

          {/* Three ways in, each explained in one line. */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Get your first data in</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link
                to="/import"
                className="group rounded-lg border border-border p-4 hover:border-primary/60 hover:bg-primary/5 transition-colors"
              >
                <Watch className="w-5 h-5 text-primary" />
                <p className="mt-2 text-sm font-medium">Connect a device</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Check connection availability and sync status, or import a supported file from your device.
                </p>
              </Link>
              <Link
                to="/import"
                className="group rounded-lg border border-border p-4 hover:border-primary/60 hover:bg-primary/5 transition-colors"
              >
                <Upload className="w-5 h-5 text-primary" />
                <p className="mt-2 text-sm font-medium">Upload a file</p>
                <p className="text-xs text-muted-foreground mt-1">
                  A .fit or .csv export from your watch. Good for Apple Watch and one-off imports.
                </p>
              </Link>
              <button
                type="button"
                onClick={onAddManual}
                className="text-left rounded-lg border border-border p-4 hover:border-primary/60 hover:bg-primary/5 transition-colors"
              >
                <Plus className="w-5 h-5 text-primary" />
                <p className="mt-2 text-sm font-medium">Log it manually</p>
                <p className="text-xs text-muted-foreground mt-1">
                  No device needed. Type the session in and the engine updates immediately.
                </p>
              </button>
            </div>
          </div>

          {/* What has actually arrived. */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">What's arrived so far</p>
              <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing} className="whitespace-nowrap">
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </div>
            <ul className="space-y-2 text-sm">
              <DataRow
                ok={hasWorkouts}
                label="Workouts"
                detail={
                  loading ? "Checking…"
                    : hasWorkouts
                      ? `${counts.workouts} session${counts.workouts === 1 ? "" : "s"}${counts.lastDate ? ` · latest ${counts.lastDate}` : ""}`
                      : "Nothing yet, use any option above"
                }
              />
              <DataRow
                ok={hasRecovery}
                label="Recovery signals"
                detail={
                  loading ? "Checking…"
                    : hasRecovery
                      ? `${counts.recoveryDays} day${counts.recoveryDays === 1 ? "" : "s"} of sleep / HRV / resting HR`
                      : "None yet, connect a wearable or log a quick check-in"
                }
              />
            </ul>
            <WearableSyncBar onSynced={handleRefresh} />
          </div>

          {wearables.length > 0 && <WearableSyncGuide selectedWearables={wearables} />}
        </CardContent>
      </Card>

      {/* The next real action: a plan grounded in what we have. */}
      <Card>
        <CardContent className="pt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Flag className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-heading font-semibold">Next: build your plan</p>
              <p className="text-sm text-muted-foreground">
                Your plan starts from the physiology above and adapts as workouts and readiness come in.
              </p>
            </div>
          </div>
          <Button asChild className="whitespace-nowrap w-full sm:w-auto">
            <Link to="/plan">Build my first plan <ArrowRight className="w-4 h-4" /></Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function DataRow({ ok, label, detail }) {
  return (
    <li className="flex items-start gap-2.5">
      {ok ? (
        <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
      ) : (
        <Circle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
      )}
      <div className="min-w-0">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">, {detail}</span>
      </div>
    </li>
  );
}
