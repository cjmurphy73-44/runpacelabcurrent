// Treat server-provided billing URLs as untrusted until their destination is verified.
// Only Stripe-hosted checkout and customer portal pages may navigate the browser.
export function trustedStripeBillingUrl(value, destination) {
  if (typeof value !== 'string' || !value || /[\\\u0000-\u001f\u007f]/.test(value)) return null;
  if (destination !== 'checkout' && destination !== 'portal') return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) return null;
    const hosts = destination === 'checkout' ? ['checkout.stripe.com'] : ['billing.stripe.com'];
    if (!hosts.includes(url.hostname)) return null;
    return url.href;
  } catch {
    return null;
  }
}
