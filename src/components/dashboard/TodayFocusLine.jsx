import React, { useMemo } from "react";
import { Target } from "lucide-react";
import { useFitness } from "@/context/FitnessContext";

// One-line "what to do today", derived only from data already on the dashboard
// (latest readiness score + current form/TSB). No new calculations or network calls.
function buildFocus(readiness, tsb) {
  const hasR = readiness != null && !isNaN(readiness);
  const hasT = tsb != null && !isNaN(tsb);
  if (!hasR && !hasT) return null;

  if (hasR && readiness < 40) {
    return { tone: "text-danger", text: "Readiness is low — keep today easy or rest." };
  }
  if (hasT && tsb <= -25) {
    return { tone: "text-danger", text: "Fatigue is deep — prioritise recovery before adding intensity." };
  }
  if (hasR && readiness >= 70 && hasT && tsb >= -10) {
    return { tone: "text-success", text: "Green light — you're ready for the prescribed session, quality included." };
  }
  if (hasR && readiness >= 70) {
    return { tone: "text-success", text: "Recovery looks good — train as planned, watch accumulated fatigue." };
  }
  return { tone: "text-warning", text: "Moderate readiness — train to plan but stay at the easy end if you feel flat." };
}

export default function TodayFocusLine({ athlete }) {
  const { dailyMetrics } = useFitness() || {};
  const readiness = useMemo(() => {
    if (!dailyMetrics?.length) return null;
    const latest = [...dailyMetrics].sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
    return latest?.readiness_score ?? null;
  }, [dailyMetrics]);

  const focus = buildFocus(readiness, athlete?.current_tsb);
  if (!focus) return null;

  return (
    <div className="flex items-start gap-3 rounded-md border border-border bg-card px-4 py-3">
      <Target className={`w-4 h-4 mt-0.5 shrink-0 ${focus.tone}`} />
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Today's focus</p>
        <p className="text-sm text-foreground">{focus.text}</p>
      </div>
    </div>
  );
}