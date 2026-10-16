import React, { useMemo, useState, useCallback } from "react";
import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Activity, RotateCcw, Save, Info } from "lucide-react";
import { useFitness } from "@/context/FitnessContext";
import { calculateFitnessFatigueOde } from "@/science/models/fitnessFatigueOde";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

const POLAR = {
  card: "hsl(var(--card))",
  border: "hsl(var(--border))",
  text: "hsl(var(--foreground))",
  muted: "hsl(var(--muted-foreground))",
  grid: "hsl(var(--border))",
  axis: "hsl(var(--muted-foreground))",
  fitness: "hsl(var(--chart-1))",
  fatigue: "hsl(var(--chart-2))",
  form: "hsl(var(--chart-4))",
};

export default function OdeModelChart({ athlete }) {
  const { dailyMetrics } = useFitness();
  const { toast } = useToast();

  const savedTau1 = athlete.ode_tau1 || 42;
  const savedTau2 = athlete.ode_tau2 || 7;

  const [tau1, setTau1] = useState(savedTau1);
  const [tau2, setTau2] = useState(savedTau2);
  const [saving, setSaving] = useState(false);
  const dirty = tau1 !== savedTau1 || tau2 !== savedTau2;

  // Build the daily TRIMP history from the fitness context (chronological order).
  const dailyHistory = useMemo(() => {
    return dailyMetrics
      .map((m) => ({ date: m.date, trimp: m.total_trimp || 0 }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [dailyMetrics]);

  // Recompute the ODE model locally with the athlete's personal time constants.
  // This runs entirely client-side — no backend call — so the sliders are instant.
  const odeStates = useMemo(() => {
    if (dailyHistory.length === 0) return [];
    return calculateFitnessFatigueOde(dailyHistory, {
      tau1,
      tau2,
      k1: 1.0,
      k2: 1.5,
      baselinePerformance: 50.0,
    });
  }, [dailyHistory, tau1, tau2]);

  const chartData = useMemo(() => {
    return odeStates.map((s) => ({
      date: s.date,
      fitness: s.fitness,
      fatigue: s.fatigue,
      form: s.form,
    }));
  }, [odeStates]);

  const todayKey = new Date().toISOString().slice(0, 10);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await base44.functions.invoke("updateAthleteProfile", {
        athlete_id: athlete.id,
        updates: { ode_tau1: tau1, ode_tau2: tau2 },
      });
      toast({ title: "Time constants saved", description: `τ₁ = ${tau1} days, τ₂ = ${tau2} days. The daily pipeline will use these on the next sync.` });
      // Trigger a recalc so the persisted ODE fields match the new taus.
      await base44.functions.invoke("recalculateCTLATLTSB", { athlete_id: athlete.id }).catch(() => {});
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [athlete.id, tau1, tau2, toast]);

  const handleReset = useCallback(() => {
    setTau1(savedTau1);
    setTau2(savedTau2);
  }, [savedTau1, savedTau2]);

  if (dailyHistory.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm font-heading">Two-Compartment ODE Model</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Log workouts to unlock the ODE fitness-fatigue curves.</p>
        </CardContent>
      </Card>
    );
  }

  const latest = odeStates[odeStates.length - 1];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-heading flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Two-Compartment ODE Model
          </CardTitle>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Banister Impulse-Response</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          A coupled differential-equation model with separate gain constants for fitness and fatigue —
          closer to the physiology of supercompensation than the single-EWMA approximation. Adjust your
          personal time constants below to match your individual rate of decay.
        </p>

        {/* Current values summary */}
        {latest && (
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Fitness f(t)</div>
              <div className="font-mono text-lg font-semibold tabular-nums" style={{ color: POLAR.fitness }}>{latest.fitness.toFixed(1)}</div>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Fatigue g(t)</div>
              <div className="font-mono text-lg font-semibold tabular-nums" style={{ color: POLAR.fatigue }}>{latest.fatigue.toFixed(1)}</div>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Form p(t)</div>
              <div className="font-mono text-lg font-semibold tabular-nums" style={{ color: POLAR.form }}>{latest.form.toFixed(1)}</div>
            </div>
          </div>
        )}

        {/* Interactive τ controls */}
        <div className="rounded-md border border-border bg-muted/20 p-4 space-y-4">
          <div className="flex items-center gap-2 text-xs font-medium text-foreground">
            <Info className="w-3.5 h-3.5 text-primary" />
            Personal time constants
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-muted-foreground">τ₁ — Fitness decay (days)</label>
                <span className="font-mono text-sm font-semibold tabular-nums text-foreground">{tau1}</span>
              </div>
              <Slider value={[tau1]} min={7} max={90} step={1} onValueChange={(v) => setTau1(v[0])} />
              <p className="mt-1 text-[10px] text-muted-foreground">How long fitness persists. Higher = slower decay, longer-lasting adaptations.</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-muted-foreground">τ₂ — Fatigue decay (days)</label>
                <span className="font-mono text-sm font-semibold tabular-nums text-foreground">{tau2}</span>
              </div>
              <Slider value={[tau2]} min={3} max={30} step={1} onValueChange={(v) => setTau2(v[0])} />
              <p className="mt-1 text-[10px] text-muted-foreground">How fast fatigue dissipates. Lower = quicker recovery between sessions.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={!dirty || saving} className="gap-1.5">
              <Save className="w-3.5 h-3.5" />
              {saving ? "Saving…" : "Save my time constants"}
            </Button>
            <Button size="sm" variant="outline" onClick={handleReset} disabled={!dirty} className="gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </Button>
          </div>
        </div>

        {/* ODE curves */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} syncId="polar-pmc" margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid stroke={POLAR.grid} strokeDasharray="3 3" opacity={0.8} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: POLAR.axis }} stroke={POLAR.grid} />
              <YAxis tick={{ fontSize: 11, fill: POLAR.axis }} stroke={POLAR.grid} />
              <Tooltip
                cursor={{ stroke: POLAR.axis, strokeDasharray: "3 3" }}
                contentStyle={{ background: POLAR.card, border: `1px solid ${POLAR.border}`, borderRadius: 8, color: POLAR.text, fontSize: 12 }}
                labelStyle={{ color: POLAR.muted }}
                itemStyle={{ color: POLAR.text }}
              />
              <ReferenceLine x={todayKey} stroke={POLAR.axis} strokeDasharray="3 3" label={{ value: "Today", fontSize: 11, fill: POLAR.muted, position: "top" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="fitness" stroke={POLAR.fitness} strokeWidth={2} dot={false} name="Fitness f(t)" connectNulls={false} />
              <Line type="monotone" dataKey="fatigue" stroke={POLAR.fatigue} strokeWidth={2} dot={false} name="Fatigue g(t)" connectNulls={false} />
              <Line type="monotone" dataKey="form" stroke={POLAR.form} strokeWidth={2} dot={false} name="Form p(t)" connectNulls={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}