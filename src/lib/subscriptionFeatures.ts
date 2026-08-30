// Central subscription feature map. Edit plan tiers / gated features here only.

export const PLAN_TIERS = ["free", "pro", "team"] as const;

export type PlanTier = (typeof PLAN_TIERS)[number];

// Gated advanced features named in Task D-22.
export const GATED_FEATURES = ["unlimited_sync", "adaptive_replan", "structured_export", "coach_workspace"] as const;
export type GatedFeature = (typeof GATED_FEATURES)[number];

export const FREE_LIMITS = {
  syncLookbackDays: 30,
  manualImportsPerDay: 3,
  aiCoachMessagesPerWeek: 5,
};

const FEATURE_BY_PLAN: Record<PlanTier, GatedFeature[]> = {
  free: [],
  pro: ["unlimited_sync", "adaptive_replan", "structured_export"],
  team: ["unlimited_sync", "adaptive_replan", "structured_export", "coach_workspace"], // team ⊇ pro + coach workspace
};

export function isPro(plan: string | null | undefined): boolean {
  return plan === "pro" || plan === "team";
}

export function hasFeature(plan: string | null | undefined, feature: GatedFeature): boolean {
  if (!plan) return false;
  return (FEATURE_BY_PLAN[plan as PlanTier] ?? []).includes(feature);
}

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
    price: "A$19",
    cadence: "per month",
    highlighted: true,
    features: ["Unlimited wearable sync — full history", "Adaptive re-planning on deviation", "Structured .fit workout export to watch", "Unlimited AI coach chat"],
  },
  team: {
    label: "Team",
    tagline: "For coaches & squads",
    price: "A$49",
    cadence: "per month",
    features: ["Everything in Pro", "Multi-athlete coach roster", "Side-by-side comparison & plan assignment", "Priority support"],
  },
};