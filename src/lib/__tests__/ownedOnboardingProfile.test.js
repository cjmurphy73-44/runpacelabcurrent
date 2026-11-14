import { describe, it, expect } from 'vitest';
import { findOwnedOnboardingProfile } from '../../lib/ownedOnboardingProfile';
describe('onboarding ownership guard', () => {
  it('selects only a profile explicitly owned by the signed-in user', () => {
    expect(findOwnedOnboardingProfile([{ id: 'other', created_by_id: 'b' }, { id: 'mine', created_by_id: 'a' }], 'a')?.id).toBe('mine');
  });
  it('never falls back to the first foreign profile', () => {
    expect(findOwnedOnboardingProfile([{ id: 'foreign', created_by_id: 'b' }], 'a')).toBeNull();
  });
  it('rejects absent owner ids and incomplete query responses', () => {
    expect(findOwnedOnboardingProfile([{ id: 'p', created_by_id: 'a' }], '')).toBeNull();
    expect(findOwnedOnboardingProfile(null, 'a')).toBeNull();
    expect(findOwnedOnboardingProfile([{ id: 'p' }], 'a')).toBeNull();
  });
  it('rejects profiles without a usable identifier', () => {
    expect(findOwnedOnboardingProfile([{ created_by_id: 'a' }, { id: '', created_by_id: 'a' }], 'a')).toBeNull();
  });
});
