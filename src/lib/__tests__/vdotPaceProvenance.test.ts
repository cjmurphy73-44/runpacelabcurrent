import { describe, expect, it } from 'vitest';
import { getVdotPaceZones } from '../physiologyEngine';

describe('legacy VDOT pace helper: fail-closed scientific provenance', () => {
  it.each([20, 30, 40, 50, 60, 75, 90])('does not invent pace zones for VDOT %s', (vdot) => {
    expect(getVdotPaceZones(vdot)).toBeNull();
  });

  it.each([0, -1, Number.NaN, Infinity, -Infinity])('does not produce a pace for unsupported score %s', (vdot) => {
    expect(getVdotPaceZones(vdot)).toBeNull();
  });

  it('never returns the same fixed pace strings as a valid athlete prescription', () => {
    const low = getVdotPaceZones(25);
    const high = getVdotPaceZones(75);
    expect(low).toBeNull();
    expect(high).toBeNull();
  });
});
