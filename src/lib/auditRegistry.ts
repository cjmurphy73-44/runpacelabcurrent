// "Show your work" audit registry. Each entry backs an <AuditBadge> slide-over
// that exposes the exact formula, citations, and raw input streams behind a
// metric. Content mirrors src/science/CITATIONS.md so the UI and the audited
// math stay in lockstep.

export interface AuditEntry {
  title: string;
  summary: string;
  formula: string;
  inputs: string[];
  citation: string;
  notes?: string;
}

export const AUDIT_REGISTRY: Record<string, AuditEntry> = {
  acwr: {
    title: "Acute:Chronic Workload Ratio",
    summary: "Flags load spikes for review — how this week's load compares to your 28-day base.",
    formula:
      "ACWR = mean(load, last 7d) ÷ mean(load, last 28d)\n\nBands (advisory, not diagnostic):\n  ≤ 1.20  Green\n  1.20–1.50  Yellow\n  > 1.50  Red\n\nload = TRIMP when HR available, else rTSS.",
    inputs: [
      "Per-session TRIMP (Banister) or rTSS (pace-based fallback)",
      "7-day acute load window",
      "28-day chronic load window",
      "Requires ≥ 14 days of data to compute",
    ],
    citation:
      "Gabbett, T.J. 2016. The training-injury prevention paradox. Br J Sports Med.\n⚠ Impellizzeri et al. 2020 (BJSM): ACWR's injury predictive power is not supported by appropriately controlled studies — flags for review, not injury causation.",
    notes:
      "ACWR is correlational, not causal. The UI distinguishes performance optimisation from injury prevention.",
  },
  vdot: {
    title: "VDOT (VO₂max equivalent)",
    summary: "Daniels' equivalent VO₂max, solved by inverting the running equation on a race result.",
    formula:
      "VDOT is solved by inverting Daniels' VO₂-cost equation on a race result:\n  VO₂ = 0.003207·D·V⁻¹ + 0.0009186·D·V⁻³·e^(0.1907 + 0.02374·V)\n  where V is speed (m/min) and D is distance (m).\nTraining paces (E/M/T/I/R) are then read from VDOT.",
    inputs: [
      "Race distance (metres)",
      "Race finish time (seconds)",
      "Age & sex (for HR zone derivation)",
    ],
    citation: "Daniels, J. 2013. Daniels' Running Formula (2nd ed.).",
    notes: "Rejects efforts < 180 s or < 1200 m — the formula inflates VDOT for sprints.",
  },
  decoupling: {
    title: "Aerobic Decoupling (Pa:HR)",
    summary: "How much your pace-per-heartbeat drifts between the first and second half of a long aerobic run.",
    formula:
      "Pa:HR = ( (HR₂/Pace₂) − (HR₁/Pace₁) ) / (HR₁/Pace₁) × 100\n\nComputed over the first vs second half of an aerobic run > 45 min.\n> 5% drift = positive decoupling (fatigue setting in).",
    inputs: [
      "Second-by-second HR stream",
      "Second-by-second pace (or power) stream",
      "Run duration > 45 min (sustained aerobic effort)",
    ],
    citation: "Skiba, A. (TrainingPeaks) Efficiency Factor & Pa:HR decoupling.",
    notes: "Only computed for sustained aerobic efforts; interval sessions distort the half-split comparison.",
  },
  strain: {
    title: "Strain Severity",
    summary: "A proxy for physiological strain from how high your average HR sat relative to your max.",
    formula:
      "strainRatio = avg_hr ÷ max_heart_rate\n\nLow < 0.75 · Moderate 0.75–0.88 · High > 0.88",
    inputs: [
      "Session average heart rate",
      "Athlete max_heart_rate (Tanaka 2001 estimate or user-set)",
    ],
    citation: "Edwards HR-zone convention; internal banding (no single primary source).",
    notes: "Proxy used when environmental data (dew point, temperature) is unavailable.",
  },
  ctl: {
    title: "CTL / ATL / TSB (Fitness, Fatigue, Form)",
    summary: "Exponentially-weighted moving averages of daily training stress.",
    formula:
      "CTL_today = CTL_yesterday·e^(−1/τc) + TSS·(1 − e^(−1/τc))\nATL_today = ATL_yesterday·e^(−1/τa) + TSS·(1 − e^(−1/τa))\nTSB = CTL − ATL\n\nDefaults: τc = 42 d, τa = 7 d (Coggan); both configurable per athlete.",
    inputs: [
      "Daily TSS (rTSS / hrTSS / TRIMP per session)",
      "Configurable τc (fitness) and τa (fatigue) time constants",
    ],
    citation: "Coggan, A. 2003. Training Stress Score & the Performance Manager Chart (PMC).",
    notes: "EWMA conflates intensity and volume — two equal-TSS days at different intensity contribute identically.",
  },
  trimp: {
    title: "Banister TRIMP",
    summary: "Heart-rate-reserve weighted training impulse for a single session.",
    formula:
      "TRIMP = duration_min × HRR × a × e^(b·HRR)\nHRR = (avg_hr − rest_hr) / (max_hr − rest_hr)\n\nMale:   a = 0.64, b = 1.92\nFemale: a = 0.86, b = 1.67",
    inputs: [
      "Session duration (min)",
      "Session average HR",
      "Resting HR",
      "Max HR",
      "Sex (banding coefficients)",
    ],
    citation: "Banister, E.W. 1991. Modeling elite athletic performance. In MacDougall, Wenger & Green (eds), Physiological Testing of the High-Performance Athlete (2nd ed.).",
    notes: "Over-counts intervals — a steady run and threshold intervals at the same average HR score identically.",
  },
};

export function auditEntry(key: string): AuditEntry | null {
  return AUDIT_REGISTRY[key] ?? null;
}