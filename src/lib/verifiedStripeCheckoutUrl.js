/** Validate a server-returned Stripe Checkout destination before top-level navigation.
 * This is a client-side defense in depth, not a substitute for server authorization.
 * A custom Stripe Checkout domain requires a separately reviewed allowlist change.
 */
export function verifiedStripeCheckoutUrl(value) {
  if (typeof value !== "string") return null;
  // URL() silently trims whitespace and strips ASCII tabs/newlines. Reject those
  // non-canonical inputs rather than accepting a destination the server did not send verbatim.
  if (value.trim() !== value || /[\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    const url = new URL(value);
    // URL() can normalize dot segments and hostname case. Never navigate to\n    // a canonicalized destination different from the backend response.\n    if (url.href !== value) return null;\n    if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com") return null;
    if (url.username || url.password || url.port || url.hash) return null;
    if (!url.pathname.startsWith("/c/") && !url.pathname.startsWith("/pay/")) return null;
    return url.href;
  } catch {
    return null;
  }
}
