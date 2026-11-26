import React from "react";
import { useFitness } from "@/context/FitnessContext";

// One-line "what to do today", derived only from data already on the dashboard
// (latest readiness score + current form/TSB). No new calculations or network calls.
function buildFocus(readiness, tsb) {
  const hasR = readiness != null && !isNaN(readiness);
  const hasT = tsb != null && !isNaN(tsb);
  if (hasR && readiness < 40) {
    return { tone: "text-danger", text: "Readiness is low, keep today easy or rest." };
  }
  if (hasT && tsb <= -25) {
    return { tone: "text-danger", text: "Fatigue is deep, prioritise recovery before adding intensity." };
  }
  if (!hasR) return null;
  if (readiness >= 70) {
    return { tone: "text-muted-foreground", text: "Readiness is high. Use how you feel to guide today’s effort." };
  }
  return { tone: "text-warning", text: "Moderate readiness, train to plan but stay at the easy end if you feel flat." };
}

export default function TodayFocusLine({ athlete, today }) {
  const { dailyMetrics } = useFitness() || {};
  const readiness = dailyMetrics?.find((metrics) => metrics.date === today)?.readiness_score;
  const focus = buildFocus(readiness, athlete?.current_tsb);
  if (!focus) return null;

  return (
    <p className={`border-t border-border pt-3 text-sm ${focus.tone}`}>{focus.text}</p>
  );
}
