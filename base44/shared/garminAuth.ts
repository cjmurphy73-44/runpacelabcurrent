// base44/shared/garminAuth.ts
// Garmin OAuth configuration + token refresh, shared by garminSync (browser flows,
// historical pulls, webhook-driven ingest) and backfillTelemetry (server-side refetch
// of a stored activity file). Plain module — no Deno.serve.

import { env } from './oauth.ts';

// Garmin's OAuth 2.0 endpoints are NOT on the data API host. The consent screen is
// served by connect.garmin.com and tokens by diauth.garmin.com. Building the authorize
// URL by appending "/oauth2/authorize" to the data API base sent the browser to
// Garmin's gateway with a path no proxy serves, returning:
//   "Unable to identify proxy for host: apis-secure and url: /oauth2/authorize".
export const DEFAULT_AUTHORIZE_URL = 'https://connect.garmin.com/oauth2Confirm';
export const DEFAULT_TOKEN_URL = 'https://diauth.garmin.com/di-oauth2-service/oauth/token';
// Public URL registered with Garmin as the redirect_uri. req.url inside the runtime is
// the internal dispatcher address, which Garmin can never bounce back to.
export const DEFAULT_REDIRECT_URI = 'https://trainpacelab.base44.app/functions/garminSync';

export function garminConfig() {
  const clientId = env('GARMIN_CLIENT_ID');
  const clientSecret = env('GARMIN_CLIENT_SECRET');
  const apiBase = env('GARMIN_API_BASE');
  return {
    clientId,
    clientSecret,
    apiBase,
    // Explicit, independently overridable endpoints — never derived from the data API base.
    authorizeUrl: env('GARMIN_AUTHORIZE_URL') || DEFAULT_AUTHORIZE_URL,
    tokenUrl: env('GARMIN_TOKEN_URL') || DEFAULT_TOKEN_URL,
    // Consent only needs the OAuth client credentials; the data API base is for
    // activity/recovery pulls and is not required to start an authorization.
    oauthConfigured: Boolean(clientId && clientSecret),
    dataConfigured: Boolean(apiBase),
  };
}

export function garminRedirectUri(): string {
  return env('GARMIN_REDIRECT_URI') || DEFAULT_REDIRECT_URI;
}

// Refresh the Garmin access token against the configured token endpoint — never the
// data API base. Any rotated refresh token is persisted so the connection never
// silently ages out; a rejected refresh means the grant is gone, so the row is flagged
// 'expired' with a reconnect message instead of staying 'connected' and failing forever.
export async function refreshGarminToken(conn: any, base44: any, force = false): Promise<{ accessToken: string; expiresAt: string | null }> {
  const { clientId, clientSecret, tokenUrl } = garminConfig();
  const now = Date.now();
  const expiresAt = conn.token_expires_at ? Date.parse(conn.token_expires_at) : 0;
  if (!force && conn.access_token && expiresAt > now + 60_000) {
    return { accessToken: conn.access_token, expiresAt: conn.token_expires_at || null };
  }
  if (!conn.refresh_token) {
    throw new Error('Garmin authorization expired — reconnect your Garmin account.');
  }
  const r = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: conn.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  const text = await r.text();
  if (!r.ok) {
    console.error('Garmin token refresh failed:', r.status, text.slice(0, 300));
    if (r.status === 400 || r.status === 401 || /invalid_grant/i.test(text)) {
      await base44.asServiceRole.entities.GarminConnection.update(conn.id, {
        status: 'expired',
        last_error: 'Garmin authorization expired — reconnect your Garmin account.',
      });
      throw new Error('Garmin authorization expired — reconnect your Garmin account.');
    }
    throw new Error(`Garmin token refresh failed (${r.status})`);
  }
  let tok: any = {};
  try { tok = JSON.parse(text); } catch { throw new Error('Garmin token endpoint returned invalid JSON'); }
  const newExpiry = new Date(now + (tok.expires_in || 3600) * 1000).toISOString();
  await base44.asServiceRole.entities.GarminConnection.update(conn.id, {
    access_token: tok.access_token || conn.access_token,
    // Garmin may rotate the refresh token; keep the existing one when it doesn't.
    refresh_token: tok.refresh_token || conn.refresh_token,
    token_expires_at: newExpiry,
    status: 'connected',
    last_error: '',
  });
  return { accessToken: tok.access_token || conn.access_token, expiresAt: newExpiry };
}