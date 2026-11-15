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
// Validate only presentation data. Reject arbitrary object graphs, NaN, stale
// provenance and unbounded free text. No private athlete identifiers in output.
export function validateVdotPresentationResponse(value, request) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(k => !['kind', 'vdot', 'source', 'modelVersion', 'calculatedAt', 'paces', 'prescription'].includes(k)) ||
      value.kind !== request.kind || value.vdot !== request.vdot ||
      typeof value.source !== 'string' || !['athlete_attested', 'manual_input'].includes(value.source) ||
      typeof value.modelVersion !== 'string' || !/^[A-Za-z0-9._-]{1,48}$/.test(value.modelVersion) ||
      typeof value.calculatedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value.calculatedAt) ||
      !Number.isFinite(Date.parse(value.calculatedAt)) ||
      new Date(value.calculatedAt).toISOString() !== (value.calculatedAt.endsWith('.000Z') ? value.calculatedAt : value.calculatedAt.replace(/Z$/, '.000Z'))) throw new Error('invalid_response');
  if (request.kind === 'paces') {
    if (value.prescription !== undefined || !value.paces || typeof value.paces !== 'object' ||
        Array.isArray(value.paces) ||
        Object.keys(value.paces).sort().join(',') !== 'easy,interval,marathon,repetition,threshold') {
      throw new Error('invalid_response');
    }
    for (const candidate of Object.values(value.paces)) {
      const pace = candidate as { secPerKm?: unknown; formatted?: unknown };
      if (!pace || typeof pace !== 'object' || Array.isArray(pace) ||
          Object.keys(pace).sort().join(',') !== 'formatted,secPerKm' ||
          typeof pace.secPerKm !== 'number' || !Number.isFinite(pace.secPerKm) || pace.secPerKm <= 0 || pace.secPerKm > 3600 ||
          typeof pace.formatted !== 'string' || !/^\d{1,2}:[0-5]\d\/km$/.test(pace.formatted)) {
        throw new Error('invalid_response');
      }
    }
  } else {
    const p = value.prescription;
    if (value.paces !== undefined || !p || typeof p !== 'object' || Array.isArray(p) ||
        Object.keys(p).sort().join(',') !== 'format,formattedPace,recoverySeconds,totalWorkMeters' ||
        p.format !== request.format || !/^\d{1,2}:[0-5]\d\/km$/.test(p.formattedPace) ||
        !Number.isSafeInteger(p.recoverySeconds) || p.recoverySeconds < 0 || p.recoverySeconds > 3600 ||
        !Number.isSafeInteger(p.totalWorkMeters) || p.totalWorkMeters <= 0 || p.totalWorkMeters > 100000) {
      throw new Error('invalid_response');
    }
  }
  return Object.freeze(value);
}
// An authenticated user ID is not an ownership proof. A trusted server-side
// lookup MUST confirm the user owns the resolved athlete. Caller input and
// requestContext flags are never sufficient to satisfy this separate check.
// This remains a disabled contract, not a deployed Base44 function.
export function hasVerifiedVdotOwner(identity, ownership) {
  return !!identity && typeof identity === 'object' && !Array.isArray(identity) &&
    typeof identity.id === 'string' && identity.id.trim().length > 0 &&
    !!ownership && typeof ownership === 'object' && !Array.isArray(ownership) &&
    typeof ownership.userId === 'string' && ownership.userId === identity.id &&
    typeof ownership.athleteId === 'string' && ownership.athleteId.trim().length > 0 &&
    ownership.verifiedByServer === true;
}
export function createVdotPresentationBoundary({ authenticate, verifyOwnedAthlete, calculate }) {
  if (typeof authenticate !== 'function' || typeof verifyOwnedAthlete !== 'function' ||
      typeof calculate !== 'function') {
    throw new Error('server_dependencies_required');
  }
  return async function handle(input, requestContext) {
    if (!VDOT_PRESENTATION_ENABLED) return { status: 503, body: { error: 'unavailable' } };
    // Disabled branch is intentional until separate staging isolation and auth proof.
    try {
      const identity = await authenticate(requestContext);
      // The resolver must use the server session and a persisted ownership
      // relationship, not any athlete ID or ownedAthleteVerified flag from input.
      const ownership = await verifyOwnedAthlete(identity);
      if (!hasVerifiedVdotOwner(identity, ownership)) {
        return { status: 401, body: { error: 'unauthorized' } };
      }
      let validated;
      try { validated = validateVdotPresentationRequest(input); }
      catch { return { status: 400, body: { error: 'invalid_request' } }; }
      const output = await calculate(validated, Object.freeze({ userId: identity.id, athleteId: ownership.athleteId }));
      return { status: 200, body: validateVdotPresentationResponse(output, validated) };
    } catch {
      // No exception text, stack, provider details or science data escapes.
      return { status: 503, body: { error: 'unavailable' } };
    }
  };
}
