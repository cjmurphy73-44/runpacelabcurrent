import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildTodayDecision } from '../todayDecisionSummary.js';

const now = Date.parse('2026-11-18T12:00:00Z');
const day = (n) => new Date(now - n*86400000).toISOString().slice(0,10);
const metric = (age, score) => ({ date: day(age), readiness_score: score });
const workout = (age, sport = 'running', extra = {}) => ({
  date: day(age), sport, duration_minutes: 42, distance_km: 7, ...extra,
});

describe('athlete-facing Today decision briefing', () => {
  it('renders low recovery and load fatigue as cautious recommendations, not clearance', () => {
    const v = buildTodayDecision({
      dailyMetrics:[metric(1,30)], athlete:{current_tsb:-30},
      workouts:[workout(1)], now,
    });
    expect(v.readinessLabel).toBe('Readiness 30/100');
    expect(v.guidance).toBe('Consider recovery or lighter training');
    expect(v.formDetail).toContain('substantial accumulated');
    expect(v.lastWorkout.title).toBe('Last workout: running');
  });

  it('does not take an old high readiness as current after two months away', () => {
    const v=buildTodayDecision({dailyMetrics:[metric(56,95)],workouts:[workout(56)],now});
    expect(v.score).toBeNull();
    expect(v.readinessLabel).toBe('Readiness unavailable');
    expect(v.readinessDetail).toContain('older than two days');
  });

  it('keeps cycling distinct from running and preserves summary load uncertainty', () => {
    const v=buildTodayDecision({workouts:[workout(1,'cycling',{load_source:'summary'})],now});
    expect(v.lastWorkout.title).toBe('Last workout: cycling');
    expect(v.lastWorkout.loadEvidence).toBe('Estimated from workout summary');
  });

  it('reports measured stream evidence only when explicitly recorded', () => {
    const v=buildTodayDecision({workouts:[workout(1,'running',{load_source:'stream'})],now});
    expect(v.lastWorkout.loadEvidence).toBe('Load from recorded stream');
  });

  it('does not invent readiness, form or a workout when data is unavailable', () => {
    const v=buildTodayDecision({now});
    expect(v.score).toBeNull();
    expect(v.formAvailable).toBe(false);
    expect(v.lastWorkout.recorded).toBe(false);
    expect(v.guidance).toBe('Review today’s planned session');
  });

  it('does not mistake invalid scores or future dates for current readiness', () => {
    const v=buildTodayDecision({dailyMetrics:[metric(-1,99),metric(1,140)],now});
    expect(v.score).toBeNull();
  });

  it('uses the newest dated workout regardless of input order', () => {
    const v=buildTodayDecision({workouts:[workout(6,'running'),workout(1,'swimming')],now});
    expect(v.lastWorkout.title).toBe('Last workout: swimming');
  });

  it('integrates ahead of Home tabs with mobile single-column layout and meaningful actions', () => {
    const workspace=readFileSync(resolve(process.cwd(),'src/components/dashboard/HomeTrainingWorkspace.jsx'),'utf8');
    const ui=readFileSync(resolve(process.cwd(),'src/components/dashboard/TodayDecisionSummary.jsx'),'utf8');
    expect(workspace).toContain('<TodayDecisionSummary athlete={athlete} workouts={workouts} />');
    expect(workspace.indexOf('Daily decision summary')).toBeLessThan(workspace.indexOf('<Tabs value={tab}'));
    expect(ui).toContain('grid-cols-1 gap-3 md:grid-cols-3');
    expect(ui).toContain('min-h-11');
    expect(ui).toContain('Not injury clearance');
    expect(ui).toContain('to="/plan"');
    expect(ui).not.toMatch(/AthleteProfile\.update|updateAthleteProfile|auth\.updateMe/);
  });
});
