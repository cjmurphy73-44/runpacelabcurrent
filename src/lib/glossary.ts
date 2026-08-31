// Single source of truth for metric acronym definitions shown across the app
// via the <Term> component's InfoTooltip. Keep entries concise and plain-language.

export interface GlossaryEntry {
  title: string;
  body: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  ctl: {
    title: "Chronic Training Load (CTL)",
    body: "A 42-day exponentially-weighted average of your daily training stress (TRIMP / TSS). It represents the long-term fitness you have built.",
  },
  atl: {
    title: "Acute Training Load (ATL)",
    body: "A 7-day exponentially-weighted average of recent training stress. It represents short-term fatigue.",
  },
  tsb: {
    title: "Training Stress Balance (TSB / Form)",
    body: "CTL minus ATL — how fresh vs fatigued you are. Optimal training: +5 to −15. Race-fresh: +10 to +25. Below −30 = overtraining risk.",
  },
  vdot: {
    title: "VDOT · VO₂max",
    body: "VO₂max is your maximum oxygen uptake (ml/kg/min). VDOT is Jack Daniels' equivalent VO₂max derived from a race result; it sets your training paces.",
  },
  threshold_pace: {
    title: "Threshold pace (T-pace)",
    body: "The running pace you can sustain for about an hour — roughly at your lactate-threshold HR. Derived from recent threshold-intensity runs when available, else from your VDOT until a real threshold effort verifies it.",
  },
  ftp: {
    title: "Functional Threshold Power (FTP)",
    body: "The cycling power, in watts, you can sustain for about an hour.",
  },
  lthr: {
    title: "Lactate Threshold Heart Rate (LTHR)",
    body: "The heart rate at which blood lactate starts accumulating faster than it's cleared — about a one-hour sustainable HR, the top of your aerobic zone.",
  },
  trimp: {
    title: "TRIMP",
    body: "TRaining IMPulse — Banister's heart-rate-based training stress score for a single session.",
  },
  rtss: {
    title: "rTSS",
    body: "Running Training Stress Score — a pace-based stress score used when heart rate isn't available.",
  },
  ef: {
    title: "Efficiency Factor (EF)",
    body: "Normalized pace (or power) divided by average heart rate. A rising EF over time signals improving aerobic fitness.",
  },
  acwr: {
    title: "Acute:Chronic Workload Ratio (ACWR)",
    body: "7-day load divided by 42-day load. Low < 0.8, moderate 0.8–1.3, elevated > 1.3 (injury risk climbs). Needs at least 14 days of data.",
  },
  hrv: {
    title: "Heart Rate Variability (HRV)",
    body: "Beat-to-beat variation in heart rate; higher generally indicates better recovery and parasympathetic nervous-system tone.",
  },
  vt1: {
    title: "Ventilatory Threshold 1 (VT1 / Aerobic)",
    body: "The aerobic threshold, estimated as LTHR − 15 bpm where direct testing isn't available.",
  },
  vt2: {
    title: "Ventilatory Threshold 2 (VT2 / LTHR)",
    body: "The anaerobic threshold ≈ LTHR, where breathing rises sharply.",
  },
  readiness: {
    title: "Readiness",
    body: "A 0–100 aggregate recovery score blending sleep, HRV and recent training load — higher means more ready to absorb a hard session.",
  },
};

export function glossary(key: string): string {
  const e = GLOSSARY[key];
  return e ? `${e.title} — ${e.body}` : "";
}