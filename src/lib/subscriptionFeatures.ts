// Central subscription feature map. Edit plan tiers / gated features here only.

export const PLAN_TIERS = ["free", "pro", "coach_pro"] as const;

export type PlanTier = (typeof PLAN_TIERS)[number];

// Gated advanced features named in Task D-22.
export const GATED_FEATURES = ["unlimited_sync", "adaptive_replan", "structured_export", "ocr_import", "coach_workspace"] as const;
export type GatedFeature = (typeof GATED_FEATURES)[number];

export const FREE_LIMITS = {
  syncLookbackDays: 30,
  manualImportsPerDay: 3,
  aiCoachMessagesPerWeek: 5,
};

const FEATURE_BY_PLAN: Record<string, GatedFeature[]> = {
  free: [],
  pro: ["unlimited_sync", "adaptive_replan", "structured_export", "ocr_import"],
  unlimited: ["unlimited_sync", "adaptive_replan", "structured_export", "ocr_import"],
  coach_pro: ["unlimited_sync", "adaptive_replan", "structured_export", "ocr_import", "coach_workspace"],
  // legacy
  team: ["unlimited_sync", "adaptive_replan", "structured_export", "ocr_import", "coach_workspace"],
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

export const PLAN_DETAILS: Record<PlanTier, { label: string; tagline: string; price: string; cadence: string; features: string[]; highlighted?: boolean; comingSoon?: boolean }> = {
  free: {
    label: "Free",
    tagline: "The Essential Tracker",
    price: "A$0",
    cadence: "forever",
    features: ["Manual & synced activity logging", "Basic calendar view & historical run log", "Standard PR tracking"],
  },
  pro: {
    label: "Pro",
    tagline: "The Advanced Athlete",
    price: "A$9",
    cadence: "per month",
    highlighted: true,
    features: ["Advanced VDOT & training-load zones", "Weather-adjusted pace calculators (heat, humidity, altitude)", "Deep performance trends & metric graphs", "Algorithmic race pacing tools"],
  },
  coach_pro: {
    label: "Coach Pro",
    tagline: "The Roster Manager",
    price: "A$29",
    cadence: "per month",
    comingSoon: true,
    features: ["Multi-athlete roster dashboard & athlete linking", "Training compliance heatmaps", "Client monitoring tools", "Advanced batch data review across athletes"],
  },
};