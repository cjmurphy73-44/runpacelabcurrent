import { describe, expect, it, vi } from 'vitest';
import { createVdotPresentationBoundary, validateVdotPresentationResponse } from '../../../base44/shared/vdotPresentationBoundary';

const request = { kind: 'paces', vdot: 50 };
const paces = Object.fromEntries(['easy', 'marathon', 'threshold', 'interval', 'repetition']
  .map(k => [k, { secPerKm: 300, formatted: '5:00/km' }]));
const response = { ...request, source: 'manual_input', modelVersion: 'v1',
  calculatedAt: '2026-11-15T00:00:00Z', paces };
describe('VDOT server response safety', () => {
  it('accepts bounded deterministic presentation and provenance', () => {
    expect(validateVdotPresentationResponse(response, request)).toEqual(response);
  });
  it('rejects leaked identity, invalid provenance and nonfinite pace', () => {
    expect(() => validateVdotPresentationResponse({ ...response, athleteId: 'private' }, request))
      .toThrow('invalid_response');
    expect(() => validateVdotPresentationResponse({ ...response, source: 'unverified_device' }, request))
      .toThrow('invalid_response');
    expect(() => validateVdotPresentationResponse({ ...response, paces: { ...paces,
      easy: { secPerKm: NaN, formatted: '5:00/km' } } }, request)).toThrow('invalid_response');
  });
  it('rejects mismatched request VDOT and invalid calculation date', () => {
    expect(() => validateVdotPresentationResponse({ ...response, vdot: 51 }, request))
      .toThrow('invalid_response');
    expect(() => validateVdotPresentationResponse({ ...response, calculatedAt: 'invalid' }, request))
      .toThrow('invalid_response');
  });
  it('requires matching Norwegian format and bounded recovery', () => {
    const req = { kind: 'norwegian', vdot: 50, format: '5x2000' };
    const value = { kind: 'norwegian', vdot: 50, source: 'manual_input',
      modelVersion: 'v1', calculatedAt: '2026-11-15T00:00:00Z',
      prescription: { format: '5x2000', formattedPace: '4:00/km',
        recoverySeconds: 90, totalWorkMeters: 10000 } };
    expect(validateVdotPresentationResponse(value, req)).toEqual(value);
    expect(() => validateVdotPresentationResponse({ ...value, prescription: {
      ...value.prescription, recoverySeconds: Infinity } }, req)).toThrow('invalid_response');
  });
  it('never invokes auth or compute while disabled', async () => {
    const authenticate = vi.fn().mockRejectedValue(new Error('secret'));
    const calculate = vi.fn();
    const handle = createVdotPresentationBoundary({ authenticate, calculate });
    expect(await handle(request, {})).toEqual({ status: 503, body: { error: 'unavailable' } });
    expect(authenticate).not.toHaveBeenCalled();
    expect(calculate).not.toHaveBeenCalled();
  });
});
