import { describe, expect, it } from 'vitest';
import { classifyRunningCalibration } from '../../../base44/shared/runningCalibrationStatus.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const now = Date.parse('2026-11-15T12:00:00Z');
const runDaysAgo = (days, sport = 'running') =>
  ({ sport, date: new Date(now - days * 86400000).toISOString() });

describe('injury-aware running calibration confidence without fabricated detraining', () => {
  it('flags a verified historical run followed by 8 weeks away from running', () => {
    expect(classifyRunningCalibration([runDaysAgo(56), runDaysAgo(1, 'cycling')], 0, now))
      .toMatchObject({ status: 'running_gap', currentVerified: false, recentRunAgeDays: 56 });
  });

  it('does not treat cycling as a substitute for threshold running evidence', () => {
    expect(classifyRunningCalibration([runDaysAgo(1, 'cycling')], 0, now))
      .toMatchObject({ status: 'needs_threshold_evidence', currentVerified: false });
  });

  it('keeps unqualified comeback runs unverified instead of treating pace as threshold', () => {
    expect(classifyRunningCalibration([runDaysAgo(1), runDaysAgo(56)], 0, now))
      .toMatchObject({ status: 'needs_threshold_evidence', currentVerified: false, recentRunAgeDays: 1 });
  });

  it('can show a provisional estimate with three observations without asserting validation', () => {
    expect(classifyRunningCalibration([runDaysAgo(2), runDaysAgo(5)], 3, now))
      .toMatchObject({ status: 'provisional', currentVerified: false });
  });

  it('ignores future, malformed and unrelated sport records', () => {
    expect(classifyRunningCalibration([
      runDaysAgo(-1), { sport: 'running', date: 'invalid' }, runDaysAgo(48, 'swimming'),
    ], 0, now)).toMatchObject({ status: 'needs_threshold_evidence', recentRunAgeDays: null });
  });
});

describe('frontend and Base44 physiology share calibration provenance', () => {
  const frontend = readFileSync(resolve(process.cwd(), 'src/lib/runningCalibrationStatus.js'), 'utf8');
  const backend = readFileSync(resolve(process.cwd(), 'base44/functions/physiologyCompute/entry.ts'), 'utf8');

  it('keeps frontend calibration as a re-export of shared rules', () => {
    expect(frontend).toContain('../../base44/shared/runningCalibrationStatus.js');
    expect(frontend).not.toContain('function classifyRunningCalibration(');
  });

  it('uses the same classifier in backend and exposes evidence without persisting changes', () => {
    expect(backend).toContain("from '../../shared/runningCalibrationStatus.js'");
    expect(backend).toContain('classifyRunningCalibration(sessions, thresholdPace.observedRunCount)');
    expect(backend).toContain('running_calibration: {');
    expect(backend).toContain('threshold_source: thresholdPace.source');
    expect(backend).toContain('history_scope: \'last_200_sessions\'');
    expect(backend).not.toMatch(/AthleteProfile\.update\(/);
  });
});
