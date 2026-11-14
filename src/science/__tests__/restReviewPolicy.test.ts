import { describe, expect, it } from 'vitest';
import { classifyRestReviewRequest, isRealUtcDate } from '../../../base44/shared/restReviewPolicy';
import { readFileSync } from 'node:fs';

const today = '2026-11-14';
const preview = { athlete_id: 'test-athlete', action: 'preview', start_date: '2026-11-01', end_date: '2026-11-13' };

describe('Science 1.8: authenticated rest review policy boundary', () => {
  it('accepts a completed 13-day read-only UTC window', () => {
    expect(classifyRestReviewRequest(preview, today)).toEqual({
      ok: true, start: '2026-11-01', end: '2026-11-13',
    });
  });
  it('refuses all rest confirmation, even with explicit consent and valid dates', () => {
    expect(classifyRestReviewRequest({ action: 'confirm_rest', date: '2026-11-12', confirm_rest: true }, today))
      .toMatchObject({ ok: false, status: 409, code: 'ATOMIC_REST_CONFIRMATION_UNAVAILABLE' });
    expect(classifyRestReviewRequest({ action: 'confirm_rest', date: '2026-11-12', confirm_rest: false }, today))
      .toMatchObject({ ok: false, status: 409, code: 'ATOMIC_REST_CONFIRMATION_UNAVAILABLE' });
  });
  it('refuses future, current, invalid, reversed, and oversized windows', () => {
    for (const patch of [
      { end_date: '2026-11-14' }, { end_date: '2026-11-15' },
      { start_date: '2026-11-13', end_date: '2026-11-12' },
      { start_date: '2026-10-01' }, { start_date: '2026-11-31' },
      { start_date: '2026-02-29' }, { start_date: 'bad' },
    ]) {
      expect(classifyRestReviewRequest({ ...preview, ...patch }, today))
        .toMatchObject({ ok: false, status: 400, code: 'INVALID_DATE_RANGE' });
    }
    expect(isRealUtcDate('2024-02-29')).toBe(true);
    expect(isRealUtcDate('2026-02-29')).toBe(false);
  });
  it('rejects arbitrary actions and never treats them as preview', () => {
    expect(classifyRestReviewRequest({ ...preview, action: 'delete' }, today))
      .toMatchObject({ ok: false, status: 400, code: 'UNSUPPORTED_ACTION' });
  });
  it('keeps ownership checks and hides backend diagnostic exceptions', () => {
    const source = readFileSync('base44/functions/reviewRestDays/entry.ts', 'utf8');
    expect(source.indexOf('assertOwnsAthlete(')).toBeLessThan(source.indexOf('classifyRestReviewRequest('));
    expect(source).toContain('base44.auth.me().catch(() => null)');
    expect(source).toContain("{ error: 'Unauthorized' }, { status: 401 }");
    expect(source).toContain("code: 'INCOMPLETE_HISTORY_READ'");
    expect(source).not.toContain('detail: error');
    expect(source).not.toMatch(/DailyMetrics\.(?:create|update|bulkUpdate)\s*\(/);
  });
});
