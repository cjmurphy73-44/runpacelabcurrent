import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { useUIPreferences } from "@/context/UIPreferencesContext";
import { termLabel, termSub } from "@/lib/terminology";
import { CheckCircle2, Circle, Gauge } from "lucide-react";

// Analytical Calibration Meter: tracks progress toward a fully locked-in
// physiological profile. Shown on the dashboard; hides once 100% locked.

function localISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

export default function CalibrationMeter({ athlete, athleteId }) {
  const { lens } = useUIPreferences();
  const [sessions, setSessions] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const cutoff = localISO(new Date(Date.now() - 90 * 86400000));
        const [s, m] = await Promise.all([
          base44.entities.WorkoutSession.filter(
            { athlete_id: athleteId, date: { $gte: cutoff } },
            "-date",
            200
          ),
          base44.entities.DailyMetrics.filter(
            { athlete_id: athleteId, date: { $gte: cutoff } },
            "-date",
            200
          ),
        ]);
        if (!active) return;
        setSessions(s || []);
        setMetrics(m || []);
      } finally {
        if (active) setLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [athleteId]);

  const signals = [];
  // 1. VDOT / aerobic capacity anchored
  const vdotOk = !!athlete?.vdot_estimate;
  signals.push({
    key: "vdot",
    label: termLabel("vdot", lens),
    sub: termSub("vdot", lens),
    ok: vdotOk,
    partial: !vdotOk && !!athlete?.max_heart_rate,
    score: vdotOk ? 25 : athlete?.max_heart_rate ? 10 : 0,
  });

  // 2. HR zones (LTHR field-tested vs estimated from max HR)
  const lthrOk = !!athlete?.lactate_threshold_hr;
  signals.push({
    key: "hr",
    label: lens === "scientific" ? "HR Zones (LTHR)" : "Heart-Rate Zones",
    sub: lthrOk ? "Field-anchored" : athlete?.max_heart_rate ? "Estimated from age" : "Set max HR",
    ok: lthrOk,
    partial: !lthrOk && !!athlete?.max_heart_rate,
    score: lthrOk ? 25 : athlete?.max_heart_rate ? 10 : 0,
  });

  // 3. Threshold pace verified (stored + ≥3 quality runs)
  const maxHr = athlete?.max_heart_rate || 0;
  const qualityRuns = sessions.filter((s) => s.avg_hr && maxHr && s.avg_hr / maxHr >= 0.8).length;
  const tpStored = !!athlete?.functional_threshold_pace_ms;
  const tpOk = tpStored && qualityRuns >= 3;
  signals.push({
    key: "tp",
    label: termLabel("threshold_pace", lens),
    sub: termSub("threshold_pace", lens),
    ok: tpOk,
    partial: tpStored || qualityRuns > 0,
    score: (tpStored ? 12 : 0) + (qualityRuns >= 3 ? 13 : qualityRuns > 0 ? 6 : 0),
  });

  // 4. Recovery data (≥7 days with HRV/sleep)
  const recoveryDays = metrics.filter((m) => m.hrv_score || m.sleep_score || m.hrv).length;
  const recoveryOk = recoveryDays >= 7;
  signals.push({
    key: "recovery",
    label: lens === "scientific" ? "Recovery (HRV/Sleep)" : "Recovery Data",
    sub: recoveryOk ? `${recoveryDays} days logged` : recoveryDays > 0 ? `${recoveryDays} day(s)` : "No recovery logs",
    ok: recoveryOk,
    partial: recoveryDays > 0,
    score: recoveryOk ? 25 : recoveryDays > 0 ? Math.round((recoveryDays / 7) * 15) : 0,
  });

  const score = Math.min(100, signals.reduce((a, s) => a + s.score, 0));
  if (loaded && score >= 100) return null; // hide once fully locked

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">
              {lens === "scientific" ? "Analytical Calibration" : "Profile Setup"}
            </span>
          </div>
          <span className="text-sm font-mono tabular-nums font-bold">{score}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden mb-3">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${score}%` }}
          />
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {signals.map((s) => (
            <li key={s.key} className="flex items-center gap-2 text-xs">
              {s.ok ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
              <span className="font-medium">{s.label}</span>
              <span className="text-muted-foreground truncate">· {s.sub}</span>
            </li>
          ))}
        </ul>
        {score < 100 && (
          <p className="mt-3 text-xs text-muted-foreground">
            {lens === "scientific"
              ? "Add a race result, a threshold run, and a week of recovery data to fully lock your model."
              : "Add a race or easy run, a hard run, and a week of sleep/HRV to fully calibrate your plan."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}