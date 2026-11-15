// Checkout navigation and query parameters are never proof of payment.
// Only a successfully refreshed, authenticated server-sourced entitlement can confirm access.
export function checkoutConfirmationState({ authenticated, loading, refreshFailed, plan, status, requestedPlan }) {
  if (!authenticated) return 'sign_in';
  if (loading || refreshFailed) return 'pending';
  if (status === 'canceled' || status === 'unpaid' || status === 'past_due' || status === 'incomplete') return 'not_active';
  if (status === 'active' && plan && plan !== 'free' && plan === requestedPlan) return 'active';
  return 'pending';
}
