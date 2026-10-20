import React from "react";
import { FlaskConical, HeartPulse, Gauge, TrendingDown, AlertTriangle } from "lucide-react";
import Reveal from "@/components/landing/Reveal";

// Public-facing scientific transparency: what feeds the model, what each metric
// means, what it assumes, and what it does NOT claim — without exposing
// proprietary coefficients or implementation details.
const INPUTS = [
  { label: "Heart rate", note: "Session-by-session HR feeds TRIMP, the backbone of training load." },
  { label: "Pace & power", note: "Normalised graded pace (or power for cycling) calibrates VDOT and rTSS." },
  { label: "Recovery signals", note: "Sleep, HRV, and resting HR from your wearable blend into readiness." },
  { label: "Race results", note: "Real finish times anchor VDOT against proven performance, not estimates." },
];

const METRICS = [
  {
    icon: Gauge,
    name: "Fitness (CTL)",
    meaning: "Chronic Training Load — a rolling average of daily training stress over ~42 days.",
    assumes: "That steady accumulated workload builds the aerobic base that race fitness rests on.",
  },
  {
    icon: TrendingDown,
    name: "Fatigue (ATL)",
    meaning: "Acute Training Load — the same stress averaged over ~7 days, reflecting how loaded your body is right now.",
    assumes: "That recent workload depresses performance temporarily before it adapts.",
  },
  {
    icon: HeartPulse,
    name: "Form (TSB)",
    meaning: "Training Stress Balance — Fitness minus Fatigue. Positive means fresh; negative means loaded.",
    assumes: "That the gap between long-term fitness and short-term fatigue tracks how race-ready you are.",
  },
  {
    icon: FlaskConical,
    name: "Readiness",
    meaning: "A holistic 0–100 score blending sleep, HRV, resting HR, and current Form.",
    assumes: "That recovery signals and training stress together predict how much load you can absorb today.",
  },
];

const LIMITATIONS = [
  "The model is a well-grounded approximation, not a medical instrument. It cannot diagnose illness, overtraining syndrome, or injury risk with certainty.",
  "Time constants (how fast fitness builds and fatigue clears) are population averages, adjustable to your own rate of adaptation.",
  "VDOT is an estimate from race performance or threshold pace; it recalibrates as you log new results.",
  "The platform complements — never replaces — listening to your body and qualified medical or coaching advice.",
];

export default function ScienceExplainedSection() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-16 sm:py-20">
      <div className="mb-12 max-w-2xl">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <FlaskConical className="w-3.5 h-3.5" /> The science, explained
        </span>
        <h2 className="mt-5 font-heading text-3xl sm:text-4xl font-bold">What feeds the model — and what it does and doesn't claim</h2>
        <p className="mt-3 text-muted-foreground">
          No black boxes. Here's exactly what goes in, what each number means, and where the model's reach ends.
          The implementation stays ours; the assumptions are yours to inspect.
        </p>
      </div>

      {/* Inputs */}
      <div className="mb-12">
        <h3 className="font-heading font-semibold text-lg mb-4">What goes in</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {INPUTS.map((inp, i) => (
            <Reveal key={inp.label} delay={(i % 4) * 0.06}>
              <div className="rounded-lg border border-border bg-card p-4 h-full">
                <p className="font-medium text-sm">{inp.label}</p>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{inp.note}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div className="mb-12">
        <h3 className="font-heading font-semibold text-lg mb-4">What the numbers mean</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {METRICS.map((m, i) => (
            <Reveal key={m.name} delay={(i % 2) * 0.08}>
              <div className="flex gap-4 rounded-lg border border-border bg-card p-5 h-full">
                <div className="shrink-0 w-10 h-10 rounded-md flex items-center justify-center bg-primary/10 text-primary">
                  <m.icon className="w-5 h-5" />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <p className="font-heading font-semibold">{m.name}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{m.meaning}</p>
                  <p className="text-xs text-muted-foreground/80 leading-relaxed">
                    <span className="font-medium text-foreground/80">Assumes:</span> {m.assumes}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* Limitations */}
      <Reveal>
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <h3 className="font-heading font-semibold text-base">Where the model's reach ends</h3>
          </div>
          <ul className="space-y-2.5">
            {LIMITATIONS.map((l) => (
              <li key={l} className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed">
                <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-warning/70" />
                <span>{l}</span>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}