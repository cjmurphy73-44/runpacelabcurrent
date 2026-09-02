import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectLabel, SelectItem } from "@/components/ui/select";
import PageShell from "@/components/layout/PageShell";
import SectionHeading from "@/components/layout/SectionHeading";
import { predictRaceTimes } from "@/science/racePrediction";
import { getEquivalentTimes } from "@/science/vdot";
import { Gauge, Timer, TrendingUp, Hourglass, Sparkles, SlidersHorizontal } from "lucide-react";
import CollapsibleSection from "@/components/ui/CollapsibleSection";

const PRESET_DISTANCES = [
  { meters: 5000, label: "5K" },
  { meters: 10000, label: "10K" },
  { meters: 21097.5, label: "Half Marathon" },
  { meters: 42195, label: "Marathon" },
];

export default function RacePrediction() {
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [distance, setDistance] = useState(5000);
  const [tsb, setTsb] = useState("");
  const [runs, setRuns] = useState("3");
  const [vdotOverride, setVdotOverride] = useState("");

  const result = useMemo(() => {
    const timeSeconds = Number(minutes) * 60 + Number(seconds);
    const useResult = timeSeconds > 0;
    const useVdot = Number(vdotOverride) > 0;
    if (!useResult && !useVdot) return null;
    return predictRaceTimes({
      vdot: useVdot ? Number(vdotOverride) : null,
      raceTimeSeconds: useResult ? timeSeconds : undefined,
      raceDistanceMeters: useResult ? distance : undefined,
      tsb: tsb ? Number(tsb) : null,
      qualifyingRunCount: Number(runs) || 0,
    });
  }, [minutes, seconds, distance, tsb, runs, vdotOverride]);

  const equivalents = useMemo(() => {
    if (!result?.vdot) return null;
    try { return getEquivalentTimes(result.vdot); } catch { return null; }
  }, [result]);

  return (
    <PageShell maxWidth="max-w-3xl">
      <SectionHeading
        title="Race Predictor"
        description="Predicted race times from your current fitness, with an honest confidence band."
        icon={Gauge}
      />
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Your recent result</CardTitle>
          <CardDescription>One recent race or a known VDOT — the model does the rest.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Label>Recent race time</Label>
              <div className="flex gap-2">
                <Input type="number" placeholder="min" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
                <Input type="number" placeholder="sec" value={seconds} onChange={(e) => setSeconds(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Distance</Label>
              <Select value={String(distance)} onValueChange={(v) => setDistance(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRESET_DISTANCES.map((d) => (
                    <SelectItem key={d.meters} value={String(d.meters)}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <CollapsibleSection title="Advanced inputs" subtitle="VDOT override · form (TSB) · qualifying runs" icon={SlidersHorizontal} className="border-t-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Current VDOT (override)</Label>
                <Input type="number" step="0.1" placeholder="from result" value={vdotOverride} onChange={(e) => setVdotOverride(e.target.value)} />
              </div>
              <div>
                <Label>TSB (form)</Label>
                <Input type="number" placeholder="e.g. +10" value={tsb} onChange={(e) => setTsb(e.target.value)} />
              </div>
              <div>
                <Label>Recent threshold runs</Label>
                <Select value={runs} onValueChange={setRuns}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Qualifying runs (6-week window)</SelectLabel>
                      {["0", "1", "2", "3", "4", "5", "6", "8"].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleSection>
        </CardContent>
      </Card>

      {!result && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Enter a recent race result or a VDOT to see predicted times across 5K → marathon with a confidence band.
          </CardContent>
        </Card>
      )}

      {result && result.predictions.length > 0 && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:space-y-0">
            <div>
              <CardTitle className="font-heading">Predicted times</CardTitle>
              <CardDescription>From VDOT {result.vdot?.toFixed(1)} · confidence {Math.round(result.confidence * 100)}%</CardDescription>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5" />
              {result.note}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {result.predictions.map((p) => (
                <div key={p.label} className="border border-border rounded-md p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{p.label}</span>
                    <Timer className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-heading tabular-nums">{p.formatted}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
                    <Hourglass className="w-3.5 h-3.5" />
                    <span>{p.bandFormatted.low} – {p.bandFormatted.high}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${Math.round(result.confidence * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            {equivalents && (
              <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                <TrendingUp className="w-3.5 h-3.5" />
                Daniels equivalents (no form adjustment): 5K {equivalents.fiveKm.formatted} · 10K {equivalents.tenKm.formatted} · Half {equivalents.halfMarathon.formatted} · Marathon {equivalents.marathon.formatted}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}