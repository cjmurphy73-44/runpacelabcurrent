import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const athleteDataEntities = [
  'AthleteProfile', 'WorkoutSession', 'WorkoutAsset',
  'WorkoutRecordingManifest', 'WorkoutStreamChunk', 'DailyMetrics',
  'TrainingPlan', 'TrainingPlanSession', 'WorkoutFeedback',
  'CoachMessage', 'LabResult',
];

describe('athlete data privacy fail-closed RLS', () => {
  for (const name of athleteDataEntities) {
    it(`${name} does not trust client-editable coached_athletes for reads`, () => {
      const schema = JSON.parse(readFileSync(resolve(process.cwd(), `base44/entities/${name}.jsonc`), 'utf8'));
      expect(JSON.stringify(schema.rls.read)).not.toContain('{{user.data.coached_athletes}}');
      expect(schema.rls.read.$or).toContainEqual({ user_condition: { role: 'admin' } });
    });
  }

  for (const name of athleteDataEntities) {
    it(`${name} does not allow a user-editable personal athlete link to grant reads`, () => {
      const schema = JSON.parse(readFileSync(resolve(process.cwd(), `base44/entities/${name}.jsonc`), 'utf8'));
      expect(JSON.stringify(schema.rls.read)).not.toContain('{{user.data.athlete_profile_id}}');
      expect(schema.rls.read.$or).toContainEqual({ created_by_id: '{{user.id}}' });
    });
  }

  it('does not allow a user-editable profile link to authorize AthleteProfile updates', () => {
    const profile = JSON.parse(readFileSync(resolve(process.cwd(), 'base44/entities/AthleteProfile.jsonc'), 'utf8'));
    expect(JSON.stringify(profile.rls.update)).not.toContain('{{user.data.athlete_profile_id}}');
    expect(profile.rls.update.$or).toContainEqual({ created_by_id: '{{user.id}}' });
  });

  it('keeps a direct personal athlete access rule while coach access is suspended', () => {
    const profile = JSON.parse(readFileSync(resolve(process.cwd(), 'base44/entities/AthleteProfile.jsonc'), 'utf8'));
    expect(profile.rls.read.$or).toContainEqual({ created_by_id: '{{user.id}}' });
    const workout = JSON.parse(readFileSync(resolve(process.cwd(), 'base44/entities/WorkoutSession.jsonc'), 'utf8'));
    expect(workout.rls.read.$or).toContainEqual({ created_by_id: '{{user.id}}' });
  });
});
