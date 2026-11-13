// Public pricing is informational. Checkout requires authentication and the
// server-authoritative Stripe/Subscription flow. Do not imply a tier has users
// or is available when its product configuration marks it as coming soon.
export function publicPlanAction(tier, details, signedIn = false) {
  if (details?.comingSoon) return { label: "Coming soon", to: null, disabled: true };
  if (signedIn) return { label: "View your plans", to: "/subscribe", disabled: false };
  if (tier === "free") return { label: "Start free", to: "/register", disabled: false };
  return { label: "Create account to upgrade", to: "/register", disabled: false };
}

export function planHighlightLabel(details) {
  return details?.highlighted ? "Featured plan" : null;
}
