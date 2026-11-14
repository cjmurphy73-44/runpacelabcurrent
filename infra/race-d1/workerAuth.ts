// Draft server-to-server authorization envelope for an isolated Worker.
// No route, keys or Worker deployment is configured. Never use from the browser.
// Caller must verify Base44 user/profile ownership BEFORE issuing this token.
const encoder = new TextEncoder();
const base64url = bytes => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};
const unbase64url = value => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('invalid_token');
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4));
  return Uint8Array.from(binary, ch => ch.charCodeAt(0));
};
const sign = async (secret, message) => {
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('weak_secret');
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(message)));
};
const safeEqual = (a, b) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
};

export async function issueRaceWorkerToken({ secret, issuer, audience, environment, ownerId, nowSeconds, nonce }) {
  if (![issuer, audience, environment, ownerId, nonce].every(v => typeof v === 'string' && v.length > 0) ||
      !Number.isSafeInteger(nowSeconds) || nonce.length < 16) throw new Error('invalid_claims');
  const claims = { v: 1, iss: issuer, aud: audience, env: environment,
    sub: ownerId, iat: nowSeconds, exp: nowSeconds + 60, jti: nonce };
  const body = base64url(encoder.encode(JSON.stringify(claims)));
  return body + '.' + base64url(await sign(secret, body));
}

export async function verifyRaceWorkerToken({ token, secret, issuer, audience, environment, nowSeconds }) {
  if (typeof token !== 'string' || token.length > 4096 || !Number.isSafeInteger(nowSeconds)) throw new Error('invalid_token');
  const parts = token.split('.');
  if (parts.length !== 2) throw new Error('invalid_token');
  const actual = unbase64url(parts[1]);
  const expected = await sign(secret, parts[0]);
  if (!safeEqual(actual, expected)) throw new Error('invalid_signature');
  const claims = JSON.parse(new TextDecoder().decode(unbase64url(parts[0])));
  if (claims.v !== 1 || claims.iss !== issuer || claims.aud !== audience || claims.env !== environment ||
      typeof claims.sub !== 'string' || !claims.sub ||
      typeof claims.jti !== 'string' || claims.jti.length < 16 ||
      !Number.isSafeInteger(claims.iat) || !Number.isSafeInteger(claims.exp) ||
      claims.iat > nowSeconds + 5 || claims.exp <= nowSeconds || claims.exp - claims.iat > 60) {
    throw new Error('invalid_claims');
  }
  // The Worker must additionally enforce a durable jti replay policy for
  // sensitive operations and derive ownerId only from these verified claims.
  return { ownerId: claims.sub, nonce: claims.jti, expiresAt: claims.exp };
}
