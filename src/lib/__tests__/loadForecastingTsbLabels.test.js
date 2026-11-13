import { describe, expect, it } from 'vitest';
import { getTsbZoneInfo } from '../loadForecasting';

describe('TSB display interpretation', () => {
  it('rejects nonfinite and nonnumeric inputs', () => {
    for (const value of [null, undefined, NaN, Infinity, -Infinity, '12']) {
      expect(getTsbZoneInfo(value).advice).toBe('Not enough data yet.');
    }
  });
  it('does not label a mathematical TSB range as injury risk or readiness clearance', () => {
    for (const value of [-40, -20, 0, 20]) {
      const result = getTsbZoneInfo(value);
      expect(result.label).not.toMatch(/high risk|optimal/i);
      expect(result.advice).not.toMatch(/high injury|good window for a hard effort|productive fatigue/i);
    }
  });
  it('preserves distinct negative and positive balance bands', () => {
    expect(getTsbZoneInfo(-30).label).toBe('Marked negative balance');
    expect(getTsbZoneInfo(-15).label).toBe('Negative balance');
    expect(getTsbZoneInfo(0).label).toBe('Neutral');
    expect(getTsbZoneInfo(20).label).toBe('Fresh');
  });
});
