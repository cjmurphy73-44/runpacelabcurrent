import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../../pages/CoachWorkspace.jsx', import.meta.url), 'utf8');
const profile = readFileSync(new URL('../../../base44/entities/AthleteProfile.jsonc', import.meta.url), 'utf8');
const assignments = readFileSync(new URL('../../../base44/entities/CoachAthleteAssignment.jsonc', import.meta.url), 'utf8');

describe('coach self-service roster privacy containment', () => {
  it('does not enumerate all athlete profiles for unauthorized direct linking', () => {
    expect(page).not.toContain('AthleteProfile.list(');
    expect(page).not.toContain('<AddAthleteDialog');
  });

  it('does not create roster assignments or grant coached_athletes from the coach page', () => {
    expect(page).not.toContain('CoachAthleteAssignment.create(');
    expect(page).not.toMatch(/auth\.updateMe\(\{\s*coached_athletes:\s*merged/);
  });

  it('communicates that athlete invitations require verified authorization', () => {
    expect(page).toContain('Athlete invitations temporarily unavailable');
    expect(page).toContain('verified coach connection');
  });

  it('retains the existing health-data RLS dependency as a documented backend blocker', () => {
    expect(JSON.parse(profile).rls.read.$or).toEqual(expect.arrayContaining([
      { id: { $in: '{{user.data.coached_athletes}}' } },
    ]));
    expect(JSON.parse(assignments).rls.create.$or).toEqual(expect.arrayContaining([
      { 'data.coach_user_id': '{{user.id}}' },
    ]));
  });
});
