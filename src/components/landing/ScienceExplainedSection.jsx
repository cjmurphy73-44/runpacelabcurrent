import React from "react";
import { FlaskConical, Calculator, Activity, Users } from "lucide-react";
import Reveal from "@/components/landing/Reveal";

// A taste of the science — not a deep technical breakdown, but enough to
// signal that this is built by people who know maths and racing, not templates.
const PILLARS = [
  {
    icon: Calculator,
    title: "Built on real mathematics",
    body: "Daily CTL/ATL/TSB modelling, HR-based TRIMP, and VDOT calibration — not a mileage counter dressed up as intelligence. Two-compartment ODE fitness/fatigue modelling sits alongside the industry-standard EWMA so you can compare both.",
  },
  {
    icon: Activity,
    title: "Designed by athletes who race",
    body: "The algorithms are written, tested, and validated by runners who train at threshold and know what a hard week feels like. The model is calibrated against real race results, not theoretical midpoints.",
  },
  {
    icon: FlaskConical,
    title: "Transparent, not a black box",
    body: "You can see what feeds every metric and what it assumes. The implementation stays ours; the methodology is yours to inspect. No hallucinated prescriptions — where the math is deterministic, the math runs.",
  },
  {
    icon: Users,
    title: "Multi-sport by design",
    body: "Running, cycling, swimming, triathlon, and strength all feed the same physiology model — because your training load reflects everything you do, not just the miles you run.",
  },
];

export default function ScienceExplainedSection() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-16 sm:py-20">
      <div className="mb-12 max-w-2xl">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <FlaskConical className="w-3.5 h-3.5" /> Runner-built. Maths-backed.
        </span>
        <h2 className="mt-5 font-heading text-3xl sm:text-4xl font-bold">A taste of the science behind it</h2>
        <p className="mt-3 text-muted-foreground">
          You don't need a sports science degree to use it — but it's reassuring to know the people
          who built it have one. Here's the short version of what makes TrainPaceLab different.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {PILLARS.map((p, i) => (
          <Reveal key={p.title} delay={(i % 2) * 0.08}>
            <div className="flex gap-4 rounded-lg border border-border bg-card p-6 h-full">
              <div className="shrink-0 w-10 h-10 rounded-md flex items-center justify-center bg-primary/10 text-primary">
                <p.icon className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className="font-heading font-semibold text-base">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}