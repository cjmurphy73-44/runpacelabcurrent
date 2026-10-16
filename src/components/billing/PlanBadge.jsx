import React from "react";
import { cn } from "@/lib/utils";

// Subtle plan "node" used two ways:
//  - current-plan chip in the header (pass `plan`)
//  - gated-feature tag (pass `feature`) showing the minimum plan that unlocks it
const PLAN_META = {
  free: { label: "Free", className: "bg-muted text-muted-foreground border-border" },
  pro: { label: "Pro", className: "bg-primary/10 text-primary border-primary/30" },
  unlimited: { label: "Unlimited", className: "bg-chart-2/10 text-chart-2 border-chart-2/30" },
  coach_pro: { label: "Coach", className: "bg-accent-pink/10 text-accent-pink border-accent-pink/30" },
  team: { label: "Coach", className: "bg-accent-pink/10 text-accent-pink border-accent-pink/30" },
};

// Minimum plan that unlocks each gated feature (from subscriptionFeatures.ts).
const FEATURE_MIN_PLAN = {
  unlimited_sync: "pro",
  adaptive_replan: "pro",
  structured_export: "pro",
  ocr_import: "pro",
  coach_workspace: "coach_pro",
};

export function planLabel(plan) {
  return PLAN_META[plan]?.label ?? plan;
}

export default function PlanBadge({ plan, feature, className = "" }) {
  const resolved = feature ? FEATURE_MIN_PLAN[feature] : plan;
  const meta = PLAN_META[resolved];
  if (!meta) return null;
  return (
    <span
      title={feature ? `Included in ${meta.label} and above` : `${meta.label} plan`}
      className={cn(
        "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide leading-none whitespace-nowrap",
        meta.className,
        className
      )}
    >
      {meta.label}
    </span>
  );
}