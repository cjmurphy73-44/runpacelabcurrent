// Presentation-only replacement boundary. No protected science, Base44 SDK,
// network operation, persisted athlete state, or live calculation is imported.
// The verified authenticated server endpoint must be built separately.
export type VdotPresentationKind = 'paces' | 'norwegian';
export type VdotPresentationState<T> =
  | { status: 'unavailable'; reason: 'not_enabled' | 'server_unverified' }
  | { status: 'loading'; requestKey: string }
  | { status: 'ready'; requestKey: string; result: T }
  | { status: 'error'; reason: 'unavailable' | 'unauthorized' | 'invalid_response' };
export type VdotPresentationResult = {
  kind: VdotPresentationKind;
  vdot: number;
  source: 'manual_input' | 'athlete_attested';
  modelVersion: string;
  calculatedAt: string;
  paces?: Record<string, { secPerKm: number; formatted: string }>;
  prescription?: { format: string; formattedPace: string; recoverySeconds: number; totalWorkMeters: number };
};
export const VDOT_CLIENT_PRESENTATION_ENABLED = false as boolean;
export const unavailableVdotPresentation = (): VdotPresentationState<VdotPresentationResult> =>
  ({ status: 'unavailable', reason: 'not_enabled' });
export function createVdotPresentationRequestKey(kind: VdotPresentationKind, vdot: number, format?: string): string | null {
  if ((kind !== 'paces' && kind !== 'norwegian') ||
      !Number.isFinite(vdot) || vdot < 1 || vdot > 120 ||
      (kind === 'norwegian' && !['10x1000','5x2000','4x3000'].includes(format ?? '')) ||
      (kind === 'paces' && format !== undefined)) return null;
  return JSON.stringify([kind, vdot, kind === 'norwegian' ? format : null]);
}
// A response MUST have been validated by the authenticated server and a
// separately trusted response validator before being passed to this reducer.
// The reducer cannot itself attest server authenticity or ownership.
export function settleVdotPresentation<T>(
  previous: VdotPresentationState<T>,
  requestKey: string,
  outcome: { ok: true; value: T } | { ok: false; reason: 'unavailable' | 'unauthorized' | 'invalid_response' },
): VdotPresentationState<T> {
  if (!VDOT_CLIENT_PRESENTATION_ENABLED) return { status: 'unavailable', reason: 'not_enabled' };
  if (previous.status !== 'loading' || previous.requestKey !== requestKey) return previous;
  if (!outcome.ok) return { status: 'error', reason: outcome.reason };
  return { status: 'ready', requestKey, result: outcome.value };
}
