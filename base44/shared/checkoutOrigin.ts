// Checkout return URLs must be anchored to operator-approved HTTPS origins.
// Never trust a caller-controlled X-Base44-App-Url without exact allowlisting.
export function approvedCheckoutOrigin(candidate: unknown, allowlist: unknown): string | null {
  if (typeof candidate !== 'string' || typeof allowlist !== 'string') return null;
  const allowed = allowlist.split(',').map(s => s.trim()).filter(Boolean);
  if (allowed.length === 0) return null;
  const parse = (raw: string): string | null => {
    if (!raw || raw !== raw.trim() || /[\\\s?#]/.test(raw)) return null;
    try {
      const url = new URL(raw);
      if (url.protocol !== 'https:' || url.username || url.password ||
          url.pathname !== '/' || url.search || url.hash ||
          !url.hostname || !['', '/'].includes(url.pathname)) return null;
      // Reject explicit paths and trailing slash variants beyond a bare origin.
      if (raw !== url.origin && raw !== url.origin + '/') return null;
      return url.origin;
    } catch { return null; }
  };
  const origin = parse(candidate);
  if (!origin) return null;
  return allowed.some(item => parse(item) === origin) ? origin : null;
}
