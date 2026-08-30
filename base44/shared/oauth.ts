// base44/shared/oauth.ts
// Generic OAuth helpers shared by corosSync, garminSync and stravaSync so the
// per-provider functions only own their endpoints + connection entity, not the
// HMAC-state signing / env plumbing that is identical across providers.
// Plain module — no Deno.serve; imported by backend function entry.ts files.

export function env(name: string): string {
  try { return Deno.env.get(name) || ''; } catch { return ''; }
}

// HMAC-SHA256 → base64url, used to sign the OAuth `state` so a forged callback
// can't bind a victim's athlete_id to an attacker's auth code.
export async function hmacBase64Url(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function buildSignedState(athleteId: string, clientSecret: string): Promise<string> {
  return `${athleteId}.${await hmacBase64Url(athleteId, clientSecret)}`;
}

export async function verifySignedState(state: string, clientSecret: string): Promise<{ athleteId: string | null; ok: boolean }> {
  const [athleteId, sig] = (state || '').split('.');
  if (!athleteId || !sig) return { athleteId: null, ok: false };
  return { athleteId, ok: (await hmacBase64Url(athleteId, clientSecret)) === sig };
}

// Fuzzy per-day duplicate guard (±1 min / ±0.1 km) shared across all ingest paths.
export async function dedupForDay(
  base44: any,
  athleteId: string,
  date: string,
  sport: string,
  durationMinutes: number,
  distanceKm: number,
): Promise<boolean> {
  const existing = await base44.asServiceRole.entities.WorkoutSession.filter({ athlete_id: athleteId, date });
  return existing.some((s) =>
    s.sport === sport &&
    Math.abs((s.duration_minutes || 0) - durationMinutes) < 1 &&
    Math.abs((s.distance_km || 0) - distanceKm) < 0.1,
  );
}