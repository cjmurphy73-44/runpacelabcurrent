import { describe, expect, it } from 'vitest';
import { resolveOnboardingOwnedProfile } from '../onboardingOwnedProfile';

const profile = (id, owner = 'athlete-user') => ({ id, created_by_id: owner });

describe('onboarding creator-owned relink', () => {
  it('relinks only a single explicitly creator-owned profile', () => {
    expect(resolveOnboardingOwnedProfile([profile('p1')], 'athlete-user')).toEqual({
      status: 'owned', profile: profile('p1'),
    });
  });
  it('allows creation only after a verified empty lookup', () => {
    expect(resolveOnboardingOwnedProfile([], 'athlete-user')).toEqual({ status: 'missing', profile: null });
  });
  it.each([
    [[profile('coach-visible', 'someone-else')], 'athlete-user'],
    [[profile('mine'), profile('theirs', 'someone-else')], 'athlete-user'],
    [[profile('mine'), profile('mine-too')], 'athlete-user'],
    [[{ id: 'p1' }], 'athlete-user'],
    [[{ id: '', created_by_id: 'athlete-user' }], 'athlete-user'],
    [[null], 'athlete-user'],
    [null, 'athlete-user'],
    [[], ''],
    [[profile('p1')], null],
  ])('fails closed on unverified, mixed, malformed or ambiguous lookup %#', (records, userId) => {
    expect(['unverified', 'ambiguous']).toContain(resolveOnboardingOwnedProfile(records, userId).status);
    expect(resolveOnboardingOwnedProfile(records, userId).profile).toBeNull();
  });
  it('does not mutate profile lookup results', () => {
    const records = Object.freeze([Object.freeze(profile('p1'))]);
    expect(resolveOnboardingOwnedProfile(records, 'athlete-user').status).toBe('owned');
  });
});
