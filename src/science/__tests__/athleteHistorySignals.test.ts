import { describe, expect, it } from 'vitest';
import { athleteHistorySignals } from '../../lib/athleteHistorySignals.mjs';

describe('deterministic athlete history signals', () => {
  const today = '2026-11-28';
  it('makes missing history and malformed input explicit', () => {
    expect(athleteHistorySignals([], today).status).toBe('no_recent_history');
    expect(athleteHistorySignals(null, today).status).toBe('unavailable');
    expect(athleteHistorySignals([], 'invalid').status).toBe('unavailable');
  });
  it('separates measured and summary sources, deduplicates saved identities', () => {
    const rows = [
      { id: 'a', date: today, sport: 'running', duration_minutes: 60, load_source: 'stream' },
      { id: 'a', date: today, sport: 'running', duration_minutes: 60, load_source: 'stream' },
      { id: 'b', date: '2026-11-26', sport: 'cycling', duration_minutes: 45, load_source: 'summary' },
      { id: 'c', date: '2026-11-25', sport: 'swimming', duration_minutes: 20 },
      { id: 'past', date: '2026-11-19', sport: 'running', duration_minutes: 90, load_source: 'stream' },
      { id: 'future', date: '2026-12-01', duration_minutes: 200, load_source: 'stream' },
    ];
    const got = athleteHistorySignals(rows, today);
    expect(got).toMatchObject({
      status: 'available', currentSessions: 3, previousSessions: 1, recentMinutes: 125,
      previousMinutes: 90, measured: 1, estimated: 1, unknown: 1, comparison: 'more_time',
    });
    expect(got.distinctSports).toEqual(['running', 'cycling', 'swimming']);
  });
  it('never treats a workout without a valid duration as known training volume', () => {
    const got = athleteHistorySignals([
      { id: 'a', date: today, duration_minutes: 'not-known' },
      { id: 'b', date: today, duration_minutes: -1 },
    ], today);
    expect(got.status).toBe('no_recent_history');
    expect(got.recentMinutes).toBe(0);
  });
  it('does not present week-over-week comparisons without both windows', () => {
    expect(athleteHistorySignals([
      { id: 'a', date: today, duration_minutes: 30, load_source: 'stream' },
    ], today).comparison).toBe('insufficient_history');
  });
});
