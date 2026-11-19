import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { localCalendarAge, localDayIndex } from '../localActivityDay.js';
import { runningCapabilitySnapshot } from '../runningCapabilitySnapshot.js';
import { buildTodayDecision } from '../todayDecisionSummary.js';

describe('Home uses the athlete browser-local calendar for date-only activity', () => {
  const now = Date.parse('2026-11-18T14:15:00Z'); // 00:15 Nov 19 Brisbane
  it('rejects malformed dates and future activity without inventing age', () => {
    expect(localDayIndex('2026-02-30')).toBeNull();
    expect(localDayIndex('not a date')).toBeNull();
    expect(localCalendarAge('2026-11-20', now)).toBeNull();
  });

  it('treats today's date-only record and local-day timestamp as today in Brisbane', () => {
    const script = `import { localCalendarAge } from './src/lib/localActivityDay.js';
import { runningCapabilitySnapshot } from './src/lib/runningCapabilitySnapshot.js';
import { buildTodayDecision } from './src/lib/todayDecisionSummary.js';
const now = Date.parse('2026-11-18T14:15:00Z');
const ages = [
  localCalendarAge('2026-11-19', now),
  localCalendarAge('2026-11-18', now),
  localCalendarAge('2026-11-18T14:05:00Z', now)
];
const runs = runningCapabilitySnapshot([
  {sport:'running',date:'2026-11-19'},
  {sport:'cycling',date:'2026-11-18T14:05:00Z'},
],now);
const today = buildTodayDecision({
  dailyMetrics: [
    {date:'2026-11-20',readiness_score:99},
    {date:'2026-11-19',readiness_score:55}
  ],
  workouts:[{date:'2026-11-19',sport:'running'}],
  now
});
console.log(JSON.stringify({ages,runs:[runs.runs42,runs.rides42,runs.lastRunDays],readiness:today.score,workout:today.lastWorkout.title}));`;
    const actual = JSON.parse(execFileSync(process.execPath, ['--input-type=module','-e',script], {
      cwd: process.cwd(),
      env: { ...process.env, TZ:'Australia/Brisbane' },
      encoding:'utf8',
    }));
    expect(actual).toEqual({
      ages:[0,1,0], runs:[1,1,0], readiness:55, workout:'Last workout: running',
    });
  });

  it('keeps dates in the past consistent when local calendar crosses a daylight-saving boundary', () => {
    // Exercise date-only ages in a second timezone with daylight saving.
    const script = `import { localCalendarAge } from './src/lib/localActivityDay.js';
console.log(JSON.stringify([
  localCalendarAge('2026-03-07',Date.parse('2026-03-08T16:00:00Z')),
  localCalendarAge('2026-03-08',Date.parse('2026-03-08T16:00:00Z'))
]));`;
    const result = JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',script],{
      cwd:process.cwd(), env:{ ...process.env,TZ:'America/New_York' }, encoding:'utf8',
    }));
    expect(result).toEqual([1,0]);
  });
});
