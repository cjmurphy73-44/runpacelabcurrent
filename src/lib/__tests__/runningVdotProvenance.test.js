import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveVdotReference } from '../../../base44/shared/runningVdotProvenance.js';

const workout = (overrides = {}) => ({
  date: '2026-11-15', sport: 'running', duration_seconds: 1200,
  distance_km: 5, source_provider: 'garmin', source_format: 'fit',
  ...overrides,
});

describe('running VDOT must have verified performance provenance', () => {
  it('preserves a stored VDOT as historical instead of recalibrating from an easy comeback run', () => {
    const result = resolveVdotReference([workout()], { vdot_estimate: 55 });
    expect(result).toMatchObject({
      vdot: null, performance_verified: false,
      source_session_id: null, source_sport: null,
      qualification_reason: 'no_server_attested_running_performance',
    });
    expect(result.source).toContain('Stored historical VDOT');
  });

  it('never accepts a mislabeled cycling ride with fast nominal running pace', () => {
    const result = resolveVdotReference([
      workout({ sport: 'running', distance_km: 30, duration_seconds: 3600,
        source_provider: 'coros', provider_activity_id: '42:session' }),
    ], { vdot_estimate: 50 });
    expect(result.vdot).toBeNull();
    expect(result.performance_verified).toBe(false);
  });

  it('does not treat Strava race-like sport or activity descriptions as an attestation', () => {
    const result = resolveVdotReference([
      workout({ sport: 'running', source_provider: 'strava', description: 'RACE 5K',
        distance_km: 5, duration_seconds: 1080 }),
    ], { vdot_estimate: 49 });
    expect(result.source_session_id).toBeNull();
    expect(result.vdot).toBeNull();
  });

  it('returns no invented VDOT when historical baseline is missing or invalid', () => {
    expect(resolveVdotReference([workout()], {}).source).toBe('No verified running performance available');
    expect(resolveVdotReference([workout()], { vdot_estimate: -1 }).vdot).toBeNull();
  });

  it('keeps the backend on the same source-qualification function', () => {
    const source = readFileSync(resolve(process.cwd(), 'base44/functions/physiologyCompute/entry.ts'), 'utf8');
    expect(source).toContain('resolveVdotReference(sessions, athlete)');
    expect(source).toContain('vdot_performance_verified: vdotResult.performance_verified');
    expect(source).toContain('vdot_qualification_reason: vdotResult.qualification_reason');
    expect(source).not.toContain('computeVdotFromSessions(');
    expect(source).not.toMatch(/AthleteProfile\.update\(/);
  });

  it('does not mistake wearable sport/source summaries for race provenance', () => {
    const schema = JSON.parse(readFileSync(resolve(process.cwd(), 'base44/entities/WorkoutSession.jsonc'), 'utf8'));
    expect(schema.properties).not.toHaveProperty('performance_attestation');
    expect(schema.properties).not.toHaveProperty('verified_race_result');
  });
});
