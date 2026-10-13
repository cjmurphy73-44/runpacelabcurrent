// Central subscription feature map. Edit plan tiers / gated features here only.

export const PLAN_TIERS = ["free", "pro", "unlimited", "coach_pro"] as const;

export type PlanTier = (typeof PLAN_TIERS)[number];

// Gated advanced features named in Task D-22.
export const GATED_FEATURES = ["unlimited_sync", "adaptive_replan", "structured_export", "ocr_import", "coach_workspace"] as const;
export type GatedFeature = (typeof GATED_FEATURES)[number];

// Free-tier limits. Keep in sync with base44/shared/syncLookback.ts (lookback) and
// base44/shared/importLimit.ts (imports per day), which enforce them server-side.
export const FREE_LIMITS = {
  syncLookbackDays: 90,
  manualImportsPerDay: 10,
  aiCoachMessagesPerWeek: 20,
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
// Until the meter exists, Pro AI calls are not metered; Pro copy says "fair-use limits"
// and only Unlimited/Coach Pro are advertised as uncapped.
export const PRO_FAIR_USE_INTENDED = { planGenerationsPerWeek: 1, deepDivesPerWeek: 1 };

export const PLAN_DETAILS: Record<PlanTier, { label: string; tagline: string; price: string; cadence: string; features: string[]; highlighted?: boolean; comingSoon?: boolean }> = {
  free: {
    label: "Free",
    tagline: "The Essential Tracker",
    price: "A$0",
    cadence: "forever",
    features: [
      "Manual & synced activity logging",
      "Basic calendar view & historical run log",
      "Standard PR tracking",
      `${FREE_LIMITS.syncLookbackDays}-day wearable sync history`,
      `${FREE_LIMITS.manualImportsPerDay} file imports per day`,
      `${FREE_LIMITS.aiCoachMessagesPerWeek} AI coach messages per week`,
    ],
  },
  pro: {
    label: "Pro",
    tagline: "The Advanced Athlete",
    price: "A$9",
    cadence: "per month",
    highlighted: true,
    features: [
      "Advanced VDOT & training-load zones",
      "Weather-adjusted pace calculators (heat, humidity, altitude)",
      "Deep performance trends & metric graphs",
      "Algorithmic race pacing tools",
      "Unlimited wearable sync history & file imports",
      "Adaptive re-planning, structured workout export & screenshot OCR import",
      "AI coaching with fair-use limits",
    ],
  },
  unlimited: {
    label: "Unlimited",
    tagline: "The Data-Driven Athlete",
    price: "A$19",
    cadence: "per month",
    features: ["Everything in Pro", "Uncapped AI coaching, plan generation and deep-dives", "Priority for new AI features"],
  },
  coach_pro: {
    label: "Coach Pro",
    tagline: "The Roster Manager",
    price: "A$29",
    cadence: "per month",
    features: ["Everything in Unlimited", "Multi-athlete roster dashboard & athlete linking", "Training compliance heatmaps", "Client monitoring tools", "Advanced batch data review across athletes"],
  },
};