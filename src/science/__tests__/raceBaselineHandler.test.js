import { describe, expect, it } from 'vitest';
import calculateRaceBaseline from '../../../base44/functions/calculateVDOT/entry';

const run = (body) => calculateRaceBaseline(new Request('https://example.test', {
  method: 'POST',
  body: JSON.stringify(body),
}));

describe('onboarding race baseline endpoint', () => {
  it('returns a VDOT and threshold pace based on the submitted race time', async () => {
    const first = await (await run({ distanceMeters: 5000, timeSeconds: 1200 })).json();
    const second = await (await run({ distanceMeters: 5000, timeSeconds: 1500 })).json();
    expect(first.vdot).toBeGreaterThan(second.vdot);
    expect(first.thresholdPaceMs).toBeGreaterThan(second.thresholdPaceMs);
    expect(second.thresholdPaceFormatted).toMatch(/^\d+:\d{2}$/);
  });

  it('rejects a nonnumeric race time', async () => {
    expect((await run({ distanceMeters: 5000, timeSeconds: '1500' })).status).toBe(400);
  });
});

it('retains an explicitly named COROS walk as walking', async () => {
  const modules = import.meta.glob('../../../base44/shared/corosMcp.ts');
  const { parseCorosRecordsText } = await modules['../../../base44/shared/corosMcp.ts']();
  const [walk] = parseCorosRecordsText('1. Outdoor Walking — 2026-11-21\nDuration: 00:30:00\nSportType: 100\nLabelId: 43210');
  expect(walk).toMatchObject({ sport: 'walking', label_id: '43210' });
});
