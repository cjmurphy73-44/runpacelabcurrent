// Offline D1 authorization nonce adapter. Worker must verify HMAC token first.
// A successful insert consumes a nonce exactly once across Worker instances.
export async function consumeRaceAuthNonce(db, { issuer, environment, nonce, expiresAt, nowSeconds }) {
  if (!db || typeof db.prepare !== 'function' ||
      ![issuer, environment, nonce].every(v => typeof v === 'string' && v.length > 0) ||
      !Number.isSafeInteger(expiresAt) || !Number.isSafeInteger(nowSeconds) ||
      expiresAt <= nowSeconds) throw new Error('invalid_nonce_claims');
  try {
    const result = await db.prepare(
      'INSERT INTO race_auth_nonces(issuer,environment,nonce,expires_at) VALUES (?,?,?,?)'
    ).bind(issuer, environment, nonce, expiresAt).run();
    if (result.success !== true) throw new Error('nonce_commit_unconfirmed');
    return true;
  } catch (error) {
    // Fail closed on duplicate, storage failure, or ambiguous commit.
    throw new Error('nonce_rejected');
  }
}
