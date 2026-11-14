// Server-owned VDOT presentation contract, deliberately not a deployed route.
// No calculation formula, SDK call, credential or athlete data is included.
// A future authenticated Base44 function may validate requests and call
// server-only base44/shared science, after staging isolation is attested.
export const VDOT_PRESENTATION_ENABLED = false;
const formats = new Set(['10x1000', '5x2000', '4x3000']);
export function validateVdotPresentationRequest(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).some(k => !['kind', 'vdot', 'format'].includes(k))) {
    throw new Error('invalid_request');
  }
  if (input.kind !== 'paces' && input.kind !== 'norwegian') throw new Error('invalid_kind');
  if (typeof input.vdot !== 'number' || !Number.isFinite(input.vdot) ||
      input.vdot < 1 || input.vdot > 120) throw new Error('invalid_vdot');
  if (input.kind === 'norwegian' && !formats.has(input.format)) throw new Error('invalid_format');
  if (input.kind === 'paces' && input.format !== undefined) throw new Error('unexpected_format');
  return Object.freeze({ kind: input.kind, vdot: input.vdot,
    ...(input.kind === 'norwegian' ? { format: input.format } : {}) });
}
export function createVdotPresentationBoundary({ authenticate, calculate }) {
  if (typeof authenticate !== 'function' || typeof calculate !== 'function') {
    throw new Error('server_dependencies_required');
  }
  return async function handle(input, requestContext) {
    if (!VDOT_PRESENTATION_ENABLED) return { status: 503, body: { error: 'unavailable' } };
    // Disabled branch is intentional until separate staging isolation and auth proof.
    const identity = await authenticate(requestContext);
    if (!identity?.id) return { status: 401, body: { error: 'unauthorized' } };
    let validated;
    try { validated = validateVdotPresentationRequest(input); }
    catch { return { status: 400, body: { error: 'invalid_request' } }; }
    return { status: 200, body: await calculate(validated, identity) };
  };
}
