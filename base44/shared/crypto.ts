// base44/shared/crypto.ts
// Constant-time string equality to avoid timing side-channels when comparing
// webhook secrets and HMAC signatures. Imported by the webhook receivers and
// the Stripe signature verifier.

export function constantTimeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}