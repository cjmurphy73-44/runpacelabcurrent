// src/lib/trainingTiers.js
//
// The three sanctioned EWMA time-constant presets for the Banister fitness/fatigue model.
// τ (tau) is the exponential weighted moving-average time constant in DAYS: a longer τ
// means a metric weighs older sessions more heavily and responds more sluggishly to a
// single hard day. CTL (fitness) uses τc; ATL (fatigue) uses τa; form is TSB = CTL − ATL.
//
// The backend (updateAthleteProfile/entry.ts) mirrors TIER_CONSTS — keep them in sync.
// The nerdy TIER_EXPLAINER is shown ONCE, in onboarding, so the τ jargon is unpacked a
// single time instead of being repeated as raw numbers in every dropdown.

export const TIER_CONSTS = {
  conservative: { ctl: 10, atl: 12 },
  moderate: { ctl: 42, atl: 7 },
  aggressive: { ctl: 20, atl: 5 },
};

export const TIER_OPTIONS = [
  { value: "conservative", label: "Conservative" },
  { value: "moderate", label: "Moderate" },
  { value: "aggressive", label: "Aggressive" },
];

// One-time nerdy explanation — shown under the tier selector in onboarding only.
// Includes the actual τ numbers WITH context so they're explained, not just displayed.
export const TIER_EXPLAINER = {
  conservative:
    "τc = 10 d, τa = 12 d — both fitness and fatigue decay inside two weeks and at nearly the same rate, so your form (TSB = CTL − ATL) barely moves. The gentlest, most injury-averse ramp; a single hard session won't spike fatigue for long.",
  moderate:
    "τc = 42 d, τa = 7 d — Banister's classical constants. Fitness accrues over ~6 weeks, fatigue washes out in a week, producing the familiar TSB oscillation across a training block. The default for most runners.",
  aggressive:
    "τc = 20 d, τa = 5 d — fitness turns over in ~3 weeks, fatigue in under a week, so form swings hard and fast. Bigger peaks, more risk — best for short, sharp race blocks.",
};