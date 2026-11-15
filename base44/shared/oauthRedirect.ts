/** Configuration only: never infer a registered callback from dispatcher/Host input. */
export function configuredOAuthRedirect(value: string, functionName: string): string {
  try {
    if (typeof value !== 'string' || !value || value !== value.trim()) throw new Error();
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
        url.hostname === 'localhost' || url.hostname.endsWith('.localhost') ||
        url.hostname.endsWith('.workers.dev') || url.hostname.endsWith('.') ||
        /^[\d.]+$/.test(url.hostname) || url.hostname.includes(':') ||
        !url.pathname.endsWith(`/functions/${functionName}`)) throw new Error();
    return url.href;
  } catch {
    throw new Error('OAuth callback address is not configured correctly. Contact support.');
  }
}
