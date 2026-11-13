import { describe, expect, it } from 'vitest';
import { buildTrainingCalendarICS } from '../trainingCalendarICS';

describe('training plan calendar export', () => {
  const now = new Date('2026-11-14T00:00:00Z');
  it('exports stable all-day events without inventing a session time', () => {
    const data = [{ id: 'session-1', date: '2026-11-14', sport: 'Running', prescribed_duration_minutes: 45 }];
    const first = buildTrainingCalendarICS(data, { now });
    const second = buildTrainingCalendarICS(data, { now });
    expect(first).toEqual(second);
    expect(first.exported).toBe(1);
    expect(first.content).toContain('DTSTART;VALUE=DATE:20261114');
    expect(first.content).toContain('DTEND;VALUE=DATE:20261115');
    expect(first.content).not.toContain('DTSTART:');
    expect(first.content).toContain('UID:tpl-session-1@trainpacelab.com');
  });

  it('escapes text and skips missing or impossible dates', () => {
    const result = buildTrainingCalendarICS([
      { id: 'x', date: '2026-02-30', title: 'Bad date' },
      { id: 'y', title: 'No date' },
      { id: 'z', date: '2026-11-14', title: 'Run, easy; steady\\test' },
    ], { now });
    expect(result.exported).toBe(1);
    expect(result.skipped).toBe(2);
    expect(result.content).toContain('SUMMARY:Run\\, easy\\; steady\\\\test');
    expect(result.content).not.toContain('Bad date');
  });

  it('folds long UTF-8 lines to the 75-octet calendar limit', () => {
    const result = buildTrainingCalendarICS([{ id: 'long', date: '2026-11-14', title: '🏃'.repeat(50) }], { now });
    for (const line of result.content.split('\r\n').filter(Boolean)) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });
});
