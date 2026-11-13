// Checkout return parameters are untrusted navigation state, not proof of payment.
// Only server-side Subscription entitlement may establish an active plan.
export function billingReturnNotice(status) {
  if (status === "success") {
    return {
      title: "Checkout returned",
      description: "We're refreshing your subscription status. Your plan is active only when payment and entitlement are confirmed.",
      refreshEntitlement: true,
      variant: "default",
    };
  }
  if (status === "canceled") {
    return {
      title: "Checkout not completed",
      description: "No subscription change has been confirmed. You can try again when ready.",
      refreshEntitlement: false,
      variant: "default",
    };
  }
  return null;
}

export function freePlanAction(currentPlan) {
  return !currentPlan || currentPlan === "free"
    ? { label: "Your current plan", manageBilling: false }
    : { label: "Manage or cancel subscription", manageBilling: true };
}
