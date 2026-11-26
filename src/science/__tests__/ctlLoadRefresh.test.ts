import { expect, it, vi } from 'vitest';
import { recomputeCTLATLTSB } from '../../../base44/shared/ctlRecalc';

it('skips unchanged days on repeat load refresh and persists corrected load provenance', async () => {
  const date = '2026-10-17';
  const sessions = [{ id: 'run', date, session_trimp: 20, load_source: 'summary' }];
  const days: Record<string, unknown>[] = [];
  const bulkCreate = vi.fn(async (rows) => { days.push(...rows.map(row => ({ ...row, id: row.date }))); });
  const bulkUpdate = vi.fn(async (rows) => {
    for (const row of rows) Object.assign(days.find(day => day.id === row.id)!, row);
  });
  const base44 = {
    asServiceRole: {
      entities: {
        AthleteProfile: {
          get: async () => ({ id: 'athlete-load', created_by_id: 'runner' }),
          update: vi.fn(),
        },
        WorkoutSession: { filter: async () => sessions },
        DailyMetrics: { filter: async () => days, bulkUpdate, bulkCreate },
      },
    },
  };
  await recomputeCTLATLTSB(base44, 'athlete-load');
  await recomputeCTLATLTSB(base44, 'athlete-load');
  expect(bulkCreate).toHaveBeenCalledTimes(1);
  expect(bulkUpdate).not.toHaveBeenCalled();
  expect(days).toMatchObject([{ total_trimp: 20, verified_trimp: 0, summary_trimp: 20 }]);
  sessions[0] = { ...sessions[0], session_trimp: 24, load_source: 'stream' };
  await recomputeCTLATLTSB(base44, 'athlete-load');
  expect(bulkUpdate).toHaveBeenCalledTimes(1);
  expect(days).toMatchObject([{ total_trimp: 24, verified_trimp: 24, summary_trimp: 0 }]);
});
