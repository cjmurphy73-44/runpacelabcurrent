// Central subscription feature map. Edit plan tiers / gated features here only.

export const PLAN_TIERS = ["free", "pro", "unlimited", "coach_pro"] as const;

export type PlanTier = (typeof PLAN_TIERS)[number];

// Gated advanced features named in Task D-22.
export const GATED_FEATURES = ["unlimited_sync", "adaptive_replan", "structured_export", "coach_workspace"] as const;
export type GatedFeature = (typeof GATED_FEATURES)[number];

export const FREE_LIMITS = {
  syncLookbackDays: 30,
  manualImportsPerDay: 3,
  aiCoachMessagesPerWeek: 5,
};

const FEATURE_BY_PLAN: Record<string, GatedFeature[]> = {
  free: [],
  pro: ["unlimited_sync", "adaptive_replan", "structured_export"],
  unlimited: ["unlimited_sync", "adaptive_replan", "structured_export"],
  coach_pro: ["unlimited_sync", "adaptive_replan", "structured_export", "coach_workspace"],
  // legacy
  team: ["unlimited_sync", "adaptive_replan", "structured_export", "coach_workspace"],
};

export function isPro(plan: string | null | undefined): boolean {
  return plan === "pro" || plan === "unlimited" || plan === "coach_pro" || plan === "team";
}

export function hasFeature(plan: string | null | undefined, feature: GatedFeature): boolean {
  if (!plan) return false;
  return (FEATURE_BY_PLAN[plan] ?? []).includes(feature);
}

// DEFERRED FOLLOW-UP — Pro fair-use meter (not yet enforced).
// Intended Pro caps once the meter is built: 1 plan generation + 1 AI deep-dive per week.
// Until then Pro and Unlimited both allow unlimited AI calls; the only communicated
// difference is price + "light AI" vs "unlimited AI" copy. Coach Pro remains uncapped.
export const PRO_FAIR_USE_INTENDED = { planGenerationsPerWeek: 1, deepDivesPerWeek: 1 };

export const PLAN_DETAILS: Record<PlanTier, { label: string; tagline: string; price: string; cadence: string; features: string[]; highlighted?: boolean }> = {
  free: {
    label: "Free",
    tagline: "TrainPaceLab essentials",
    price: "$0",
    cadence: "forever",
    features: ["Dashboard & physiology lab", "Manual + single wearable sync (30-day lookback)", "AI coach — 5 messages / week", "Race pacing & VDOT tools"],
  },
  pro: {
    label: "Pro",
    tagline: "For the data-driven athlete",
    price: "A$9",
    cadence: "per month",
    highlighted: true,
    features: ["Unlimited wearable sync — full history", "Adaptive re-planning on deviation", "Structured .fit workout export to watch", "AI coach — post-workout insights & race strategy"],
  },
  unlimited: {
    label: "Unlimited",
    tagline: "For the serious athlete",
    price: "A$15",
    cadence: "per month",
    features: ["Everything in Pro", "Unlimited AI coach — plans, deep-dives & strategy", "Full race strategy planner", "Priority data processing"],
  },
  coach_pro: {
    label: "Coach Pro",
    tagline: "For coaches & squads",
    price: "A$29",
    cadence: "per month",
    features: ["Everything in Unlimited", "Multi-athlete coach roster", "Side-by-side comparison & plan assignment", "Priority support"],
  },
};