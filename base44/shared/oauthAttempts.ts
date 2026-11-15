// Opaque OAuth state. Identity and PKCE secrets stay server-side. Runtime
// acceptance MUST verify deleteMany returns the actual count of active rows
// consumed, including simultaneous calls. Never substitute get/update or a
// worker-local Set for that boundary.
const TTL_MS = 10 * 60 * 1000;
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const NONCE = /^[A-Za-z0-9_-]{43}$/;
const invalid = () => new Error('OAuth security state is invalid or expired. Start connecting again.');

function nonce() {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function digest(value: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
function redirect(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) throw invalid();
  return url.href;
}

export async function issueOAuthAttempt(base44: any, input: {
  provider: string; athlete: any; ownerUserId: string; redirectUri: string; verifier?: string;
}, now = Date.now()): Promise<{ state: string; cookie: string }> {
  if (!input.athlete?.id || !input.ownerUserId || input.athlete.created_by_id !== input.ownerUserId) throw invalid();
  if (!ID.test(input.provider) || !Number.isFinite(now)) throw invalid();
  if (input.provider === 'coros' && !/^[A-Za-z0-9_-]{43,128}$/.test(input.verifier || '')) throw invalid();
  const random = nonce();
  const browser = nonce();
  const payload = {
    provider: input.provider, athlete_id: input.athlete.id, owner_user_id: input.ownerUserId,
    redirect_uri: redirect(input.redirectUri), nonce_hash: await digest(random),
    browser_binding_hash: await digest(browser),
    pkce_verifier: input.verifier || '', issued_at: now, expires_at: now + TTL_MS,
  };
  const repo = base44.asServiceRole.entities.OAuthAttempt;
  const row = await repo.create(payload);
  if (!ID.test(row?.id || '')) throw invalid();
  // Fail closed if persistence silently omitted any security binding.
  const saved = await repo.get(row.id);
  if (!saved || Object.entries(payload).some(([key, value]) => saved[key] !== value)) throw invalid();
  return {
    state: `${row.id}.${random}`,
    cookie: `__Host-tpl-oauth-${row.id}=${browser}; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=600`,
  };
}

export async function consumeOAuthAttempt(base44: any, state: string, provider: string, redirectUri: string, cookieHeader: string, now = Date.now()) {
  const parts = typeof state === 'string' ? state.split('.') : [];
  if (parts.length !== 2 || !ID.test(parts[0]) || !NONCE.test(parts[1])) throw invalid();
  const cookieName = `__Host-tpl-oauth-${parts[0]}`;
  const cookies = String(cookieHeader || '').split(';').map((value) => value.trim()).filter((value) => value.startsWith(cookieName + '='));
  if (cookies.length !== 1) throw invalid();
  const browser = cookies[0].slice(cookieName.length + 1);
  if (!NONCE.test(browser)) throw invalid();
  const repo = base44.asServiceRole.entities.OAuthAttempt;
  const row = await repo.get(parts[0]).catch(() => null);
  const hash = await digest(parts[1]);
  const browserHash = await digest(browser);
  if (!row || row.id !== parts[0] || row.nonce_hash !== hash || row.browser_binding_hash !== browserHash || row.provider !== provider ||
      row.redirect_uri !== redirect(redirectUri) || !row.owner_user_id || !row.athlete_id ||
      !Number.isFinite(row.issued_at) || !Number.isFinite(row.expires_at) || !Number.isFinite(now) ||
      row.issued_at > now || row.expires_at <= now || row.expires_at - row.issued_at !== TTL_MS ||
      (provider === 'coros' && !/^[A-Za-z0-9_-]{43,128}$/.test(row.pkce_verifier || ''))) throw invalid();
  const athlete = await base44.asServiceRole.entities.AthleteProfile.get(row.athlete_id).catch(() => null);
  if (!athlete || athlete.id !== row.athlete_id || athlete.created_by_id !== row.owner_user_id) throw invalid();
  const result = await repo.deleteMany({
    id: row.id, nonce_hash: hash, provider, athlete_id: row.athlete_id,
    owner_user_id: row.owner_user_id, issued_at: row.issued_at, expires_at: row.expires_at,
    redirect_uri: row.redirect_uri,
    browser_binding_hash: browserHash,
  });
  // Boolean success alone is NOT one-time consumption proof.
  if (result?.success !== true || result.deleted !== 1) throw invalid();
  return { athlete, athleteId: row.athlete_id, ownerUserId: row.owner_user_id, verifier: row.pkce_verifier || null };
}
