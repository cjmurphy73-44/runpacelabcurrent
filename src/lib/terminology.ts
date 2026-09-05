// Dual-lens terminology map. Drives the Scientific ↔ Simplified mode: each metric
// has a technical (scientific) label/sub and a plain-language (simplified) pair.
// Consumed by <LensLabel> and by analytics cards that switch wording with mode.

export type Lens = "scientific" | "simplified";

interface TermEntry {
  scientific: { label: string; sub: string };
  simplified: { label: string; sub: string };
}

export const TERMINOLOGY: Record<string, TermEntry> = {
  acwr: {
    scientific: { label: "ACWR", sub: "Acute:Chronic Workload Ratio" },
    simplified: { label: "Load Balance", sub: "This week's load vs your average" },
  },
  ctl: {
    scientific: { label: "CTL", sub: "Chronic Training Load" },
    simplified: { label: "Fitness", sub: "Long-term fitness you've built" },
  },
  atl: {
    scientific: { label: "ATL", sub: "Acute Training Load" },
    simplified: { label: "Fatigue", sub: "Short-term tiredness from training" },
  },
  tsb: {
    scientific: { label: "TSB", sub: "Training Stress Balance" },
    simplified: { label: "Form", sub: "Fresh vs fatigued balance" },
  },
  vdot: {
    scientific: { label: "VDOT", sub: "VO₂max equivalent" },
    simplified: { label: "Engine Size", sub: "Your aerobic capacity estimate" },
  },
  trimp: {
    scientific: { label: "TRIMP", sub: "Training Impulse" },
    simplified: { label: "Session Strain", sub: "Heart-rate-based effort" },
  },
  rtss: {
    scientific: { label: "rTSS", sub: "Running Training Stress Score" },
    simplified: { label: "Pace Strain", sub: "Pace-based session effort" },
  },
  ef: {
    scientific: { label: "Efficiency Factor", sub: "NGP ÷ avg HR" },
    simplified: { label: "Efficiency", sub: "Output earned per heartbeat" },
  },
  decoupling: {
    scientific: { label: "Pa:HR Decoupling", sub: "Aerobic decoupling" },
    simplified: { label: "Efficiency Drift", sub: "Whether you hold pace as you tire" },
  },
  strain: {
    scientific: { label: "Strain Severity", sub: "avg HR ÷ max HR" },
    simplified: { label: "Effort Load", sub: "How hard the session was on you" },
  },
  tau_c: {
    scientific: { label: "τc", sub: "CTL time constant (days)" },
    simplified: { label: "Fitness Build", sub: "Fitness build-up window" },
  },
  tau_a: {
    scientific: { label: "τa", sub: "ATL time constant (days)" },
    simplified: { label: "Fatigue Build", sub: "Fatigue build-up window" },
  },
  threshold_pace: {
    scientific: { label: "Threshold Pace", sub: "T-pace" },
    simplified: { label: "Hour Pace", sub: "Pace you can hold ~1 hour" },
  },
  hrv: {
    scientific: { label: "HRV", sub: "Heart Rate Variability" },
    simplified: { label: "Recovery Signal", sub: "Beat-to-beat recovery tone" },
  },
  readiness: {
    scientific: { label: "Readiness", sub: "Recovery score" },
    simplified: { label: "Ready to Train", sub: "Today's training capacity" },
  },
};

export function termLabel(k: string, lens: Lens): string {
  const e = TERMINOLOGY[k];
  return e ? e[lens].label : k;
}

export function termSub(k: string, lens: Lens): string {
  const e = TERMINOLOGY[k];
  return e ? e[lens].sub : "";
}