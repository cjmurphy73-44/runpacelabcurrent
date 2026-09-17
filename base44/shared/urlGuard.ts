// base44/shared/urlGuard.ts
// SSRF defense for server-side fetches of user-supplied file URLs.
// Rejects non-https, localhost, private/loopback/link-local ranges, and the
// cloud-metadata endpoint before any fetch() is issued.

export function assertSafeFileUrl(raw: string): { ok: true; url: URL } | { ok: false; reason: string } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: 'file_url is not a valid URL' };
  }
  if (url.protocol !== 'https:') {
    return { ok: false, reason: 'file_url must use https' };
  }
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host === '::1') {
    return { ok: false, reason: 'file_url host not allowed' };
  }
  // Reject IPv4 in private/loopback/link-local/metadata ranges.
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 127 || a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a === 169 || a === 0) {
      return { ok: false, reason: 'file_url host not allowed' };
    }
  }
  // Reject IPv6 private/ULA + link-local.
  if (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) {
    return { ok: false, reason: 'file_url host not allowed' };
  }
  // Explicitly block the GCP/AWS/Azure metadata host even though 169.* already rejects it.
  if (host === '169.254.169.254' || host === 'metadata.google.internal') {
    return { ok: false, reason: 'file_url host not allowed' };
  }
  return { ok: true, url };
}