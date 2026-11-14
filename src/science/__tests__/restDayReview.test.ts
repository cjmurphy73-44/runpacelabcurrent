import { describe, expect, it } from 'vitest';
import { buildRestReview, canConfirmRest } from '../../../base44/shared/restDayReview';

const session = (date: string, load = 40) => ({ date, session_trimp: load, load_source: 'stream' });

describe('Science 1.4: explicit rest review', () => {
  it('does not infer rest from a successful sync or absent workouts', () => {
    const days = buildRestReview([session('2026-11-10')], [], '2026-11-10', '2026-11-12');
    expect(days.map((d) => d.status)).toEqual(['recorded', 'unknown', 'unknown']);
    expect(canConfirmRest(days[1], false)).toBe(false);
  });

  it('only allows explicit confirmation of an empty unverified day', () => {
    const days = buildRestReview([session('2026-11-10')],
      [{ date: '2026-11-11', confirmed_rest: true }], '2026-11-10', '2026-11-12');
    expect(days.map((d) => d.status)).toEqual(['recorded', 'confirmed_rest', 'unknown']);
    expect(canConfirmRest(days[0], true)).toBe(false);
    expect(canConfirmRest(days[1], true)).toBe(false);
    expect(canConfirmRest(days[2], true)).toBe(true);
  });

  it('blocks conflicting rest evidence and incomplete load', () => {
    const days = buildRestReview([session('2026-11-10'), { date: '2026-11-11', session_trimp: 0, load_source: 'none' }],
      [{ date: '2026-11-10', confirmed_rest: true }], '2026-11-10', '2026-11-11');
    expect(days.map((d) => d.status)).toEqual(['conflict', 'incomplete_load']);
    expect(days.every((d) => !canConfirmRest(d, true))).toBe(true);
  });

  it('rejects invalid, future-independent and oversized review ranges', () => {
    expect(() => buildRestReview([], [], '2026-11-31', '2026-12-01')).toThrow('invalid_review_window');
    expect(() => buildRestReview([], [], '2026-10-01', '2026-11-14')).toThrow('invalid_review_window');
    expect(() => buildRestReview([], [], '2026-11-14', '2026-11-13')).toThrow('invalid_review_window');
  });

  it('keeps athlete-declared rest separate from recorded training load', () => {
    const days = buildRestReview([], [{ date: '2026-11-13', confirmed_rest: true }], '2026-11-13', '2026-11-13');
    expect(days[0]).toMatchObject({ status: 'confirmed_rest', session_count: 0 });
  });
});
