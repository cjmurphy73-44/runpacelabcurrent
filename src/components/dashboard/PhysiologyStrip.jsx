import React, { useMemo } from "react";
import { useFitness } from "@/context/FitnessContext";
import { calculateACWR } from "@/lib/injuryEngine";
import { deriveRunningThresholdPace } from "@/utils/physiology/thresholdPaceEngine";
import { Term } from "@/components/ui/Term";
import { Zap, Gauge, ShieldAlert, HeartPulse } from "lucide-react";

// Map the threshold-engine provenance strings to clear on-tile sub-labels.
// We deliberately keep the literal "VDOT"/"vdot" wording OFF the tile (it reads
// like a glitch) — the full provenance is still available via the hover tooltip.
function humanThresholdSource(source) {
  if (!source) return "";
  const map = {
    "VDOT Daniels T-pace": "Estimated · log a threshold run to verify",
    "VDOT only — cross-training in progress": "Cross-training · estimated until a run verifies",
    "Stored baseline": "From your stored baseline",
    "Set VDOT or a baseline": "Set VDOT or a baseline",
  };
  return map[source] || source;
}

const ZONE = {
  Green: { label: "Low", badge: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  Yellow: { label: "Moderate", badge: "border-amber-200 bg-amber-50 text-amber-700" },
  Red: { label: "Elevated", badge: "border-rose-200 bg-rose-50 text-rose-700" },
};

function formatPace(ms) {
  if (!ms || ms <= 0) return "—";
  const secPerKm = 1000 / ms;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function readinessTone(v) {
  if (v == null) return { label: "—", cls: "text-muted-foreground" };
  if (v >= 70) return { label: "High", cls: "text-emerald-600" };
  if (v >= 40) return { label: "Moderate", cls: "text-amber-600" };
  return { label: "Low", cls: "text-rose-600" };
}

function Tile({ icon: Icon, label, value, suffix, sub, badge }) {
  return (
    <div className="rounded-md border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="w-3.5 h-3.5 text-primary" /> {label}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-mono font-semibold tabular-nums text-foreground">{value}</span>
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
      {badge ? (
        <span className={`inline-block mt-2 text-[10px] font-medium px-2 py-0.5 rounded-full border ${badge}`}>{sub}</span>
      ) : sub ? (
        <span className="block mt-1 text-[11px] text-muted-foreground">{sub}</span>
      ) : null}
    </div>
  );
}

export default function PhysiologyStrip({ athlete }) {
  const { dailyMetrics, workoutSessions } = useFitness();

  const vdot = athlete?.vdot_estimate ?? null;
  const threshold = useMemo(
    () => deriveRunningThresholdPace(
        workoutSessions,
        athlete?.vdot_estimate,
        athlete?.functional_threshold_pace_ms,
        athlete?.lactate_threshold_hr,
      ),
    [workoutSessions, athlete?.vdot_estimate, athlete?.functional_threshold_pace_ms, athlete?.lactate_threshold_hr]
  );

  const injury = useMemo(
    () => calculateACWR(dailyMetrics.map((d) => ({ load: d.total_trimp || 0 }))),
    [dailyMetrics]
  );
  const hasInjuryData = dailyMetrics.length >= 14;

  const latest = useMemo(() => {
    if (!dailyMetrics.length) return null;
    return [...dailyMetrics].sort((a, b) => b.date.localeCompare(a.date))[0];
  }, [dailyMetrics]);
  const readiness = latest?.readiness_score ?? null;
  const rTone = readinessTone(readiness);

  const zone = ZONE[injury.zone];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Tile
        icon={Zap}
        label={<Term k="vdot">VO₂max · VDOT</Term>}
        value={vdot != null ? Math.round(vdot) : "—"}
        suffix={vdot != null ? "ml/kg/min" : ""}
        sub={vdot == null ? "Set in Physiology" : undefined}
      />
      <Tile
        icon={Gauge}
        label={<Term k="threshold_pace">Threshold pace</Term>}
        value={formatPace(threshold.paceMs)}
        suffix={threshold.paceMs ? "/km" : ""}
        sub={threshold.paceMs ? humanThresholdSource(threshold.source) : "Set in Physiology"}
      />
      <Tile
        icon={ShieldAlert}
        label={<Term k="acwr">Injury risk</Term>}
        value={hasInjuryData ? zone.label : "—"}
        badge={hasInjuryData ? zone.badge : undefined}
        sub={hasInjuryData ? `ACWR ${injury.acwr.toFixed(2)}` : "Needs 14 days"}
      />
      <Tile
        icon={HeartPulse}
        label={<Term k="readiness">Readiness</Term>}

        value={readiness != null ? readiness : "—"}
        suffix={readiness != null ? "/100" : ""}
        sub={readiness != null ? rTone.label : "No score today"}
      />
    </div>
  );
}