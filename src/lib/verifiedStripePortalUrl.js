/** Validate Stripe-hosted customer billing portal redirects, independent of Checkout.
 * Defense in depth only: server-side authentication and portal-session ownership remain mandatory.
 * Custom portal domains require a reviewed explicit allowlist change.
 */
export function verifiedStripePortalUrl(value) {
  if (typeof value !== "string" || value.trim() !== value || /[\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    const url = new URL(value);
    // Reject parser-normalized paths (including dot-segment traversal) rather than
    // silently navigating to a different session path than the server supplied.
    if (url.href !== value) return null;
    if (url.protocol !== "https:" || url.hostname !== "billing.stripe.com") return null;
    if (url.username || url.password || url.port || url.hash) return null;
    // Portal session links must name one opaque path segment. Do not accept\n    // appended routes or encoded separators as part of a redirect target.\n    if (!/^\\/p\\/session\\/[^/%]+$/.test(url.pathname)) return null;
    return url.href;
  } catch {
    return null;
  }
}
