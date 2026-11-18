import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const page = readFileSync(resolve(process.cwd(), 'src/pages/CoachWorkspace.jsx'), 'utf8');
const profile = readFileSync(resolve(process.cwd(), 'base44/entities/AthleteProfile.jsonc'), 'utf8');
const assignments = readFileSync(resolve(process.cwd(), 'base44/entities/CoachAthleteAssignment.jsonc'), 'utf8');

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

  it('fails closed on client-controlled coach cache and blocks direct coach assignment', () => {
    expect(JSON.stringify(JSON.parse(profile).rls.read)).not.toContain('{{user.data.coached_athletes}}');
    // Assignment creation remains admin-only until athlete consent is verified.
    expect(JSON.parse(assignments).rls.create).toEqual({
      user_condition: { role: 'admin' },
    });
  });
});
