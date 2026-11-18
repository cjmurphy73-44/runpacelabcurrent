import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runningCapabilitySnapshot, paceTextFromSpeed } from '../runningCapabilitySnapshot.js';

const now = Date.parse('2026-11-18T12:00:00Z');
const workout = (days, sport = 'running') => ({
  sport, date: new Date(now - days * 86400000).toISOString().slice(0, 10),
});

describe('athlete-facing running capability after injury or cross training', () => {
  it('distinguishes eight weeks away from running from recent cycling', () => {
    const s = runningCapabilitySnapshot([workout(56), workout(2,'cycling'), workout(4,'cycling')], now);
    expect(s).toMatchObject({ status: 'running_break', runs42: 0, rides42: 2, lastRunDays: 56, confidence: 'unverified' });
  });

  it('does not mistake early comeback runs for a threshold test', () => {
    const s = runningCapabilitySnapshot([workout(1),workout(6),workout(55)],now);
    expect(s).toMatchObject({ status: 'returning', runs42: 2, confidence: 'unverified' });
  });

  it('does not assert a training break when history reaches the fetch limit', () => {
    expect(runningCapabilitySnapshot([workout(56),workout(3,'cycling')],now,2).status)
      .toBe('limited_history');
  });

  it('keeps consistently active running provisional until performance verification', () => {
    expect(runningCapabilitySnapshot([workout(1),workout(3),workout(5),workout(9)],now))
      .toMatchObject({status:'active_unverified',runs42:4,confidence:'unverified'});
  });

  it('ignores future sessions, malformed dates and nonrunning labels', () => {
    const s = runningCapabilitySnapshot([workout(-1),{sport:'running',date:'bad'},workout(1,'swimming')],now);
    expect(s).toMatchObject({runs42:0,rides42:0,lastRunDate:null});
  });

  it('formats historical pace from meters per second without manufacturing measurements', () => {
    expect(paceTextFromSpeed(1000/226)).toBe('3:46/km');
    expect(paceTextFromSpeed(null)).toBeNull();
    expect(paceTextFromSpeed(-1)).toBeNull();
  });

  it('renders on Home as a read-only panel with navigation and history honesty', () => {
    const home = readFileSync(resolve(process.cwd(),'src/pages/Home.jsx'),'utf8');
    const ui = readFileSync(resolve(process.cwd(),'src/components/dashboard/RunningCapabilityPanel.jsx'),'utf8');
    expect(home).toContain('<RunningCapabilityPanel athlete={athlete} workouts={loadTimelineWorkouts} />');
    expect(ui).toContain('Current pace unverified');
    expect(ui).toContain('Historical reference');
    expect(ui).toContain('Only a limited activity window');
    expect(ui).toContain('to="/vdot"');
    expect(ui).toContain('to="/plan"');
    expect(ui).not.toMatch(/AthleteProfile\.update|updateAthleteProfile|auth\.updateMe/);
  });
});
