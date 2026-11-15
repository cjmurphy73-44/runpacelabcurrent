import { describe, it, expect, vi } from 'vitest';
import { completeOwnedOnboarding } from '../../lib/completeOwnedOnboarding';

const owned = { id: 'profile_a', created_by_id: 'user_a' };
const args = (overrides = {}) => ({
  userId: 'user_a',
  listProfiles: vi.fn(async () => [owned]),
  createProfile: vi.fn(async () => ({ id: 'created' })),
  linkProfile: vi.fn(async () => {}),
  payload: { first_name: 'Sample' },
  ...overrides,
});
describe('onboarding profile ownership and recovery', () => {
  it('relinks an existing owned profile without creating another', async () => {
    const a = args();
    expect(await completeOwnedOnboarding(a)).toEqual({ profile: owned, mode: 'relink' });
    expect(a.createProfile).not.toHaveBeenCalled();
    expect(a.linkProfile).toHaveBeenCalledWith('profile_a');
  });
  it('rejects foreign rows even if a scoped filter returned them', async () => {
    const a = args({ listProfiles: vi.fn(async () => [{ id: 'foreign', created_by_id: 'user_b' }]) });
    await expect(completeOwnedOnboarding(a)).rejects.toThrow('ownership');
    expect(a.createProfile).not.toHaveBeenCalled();
    expect(a.linkProfile).not.toHaveBeenCalled();
  });
  it('refuses to create when profile lookup fails or returns malformed data', async () => {
    for (const listProfiles of [async () => null, async () => { throw new Error('network'); }]) {
      const a = args({ listProfiles });
      await expect(completeOwnedOnboarding(a)).rejects.toThrow();
      expect(a.createProfile).not.toHaveBeenCalled();
    }
  });
  it('verifies a newly created profile before linking', async () => {
    const newProfile = { id: 'created', created_by_id: 'user_a' };
    const a = args({ listProfiles: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([newProfile]) });
    expect(await completeOwnedOnboarding(a)).toEqual({ profile: newProfile, mode: 'new' });
    expect(a.linkProfile).toHaveBeenCalledWith('created');
  });
  it('does not link an unverified create response', async () => {
    const a = args({ listProfiles: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]) });
    await expect(completeOwnedOnboarding(a)).rejects.toThrow('ownership');
    expect(a.linkProfile).not.toHaveBeenCalled();
  });
  it('retries failed linkage by relinking, without creating a duplicate', async () => {
    const created = { id: 'created', created_by_id: 'user_a' };
    const rows = vi.fn().mockResolvedValueOnce([]).mockResolvedValue([created]);
    const linkProfile = vi.fn().mockRejectedValueOnce(new Error('link failed')).mockResolvedValue(undefined);
    const a = args({ listProfiles: rows, createProfile: vi.fn(async () => created), linkProfile });
    await expect(completeOwnedOnboarding(a)).rejects.toThrow('link failed');
    expect(await completeOwnedOnboarding(a)).toEqual({ profile: created, mode: 'relink' });
    expect(a.createProfile).toHaveBeenCalledTimes(1);
    expect(linkProfile).toHaveBeenCalledTimes(2);
  });
  it('does not continue after link failure for an existing profile', async () => {
    const a = args({ linkProfile: vi.fn(async () => { throw new Error('link failed'); }) });
    await expect(completeOwnedOnboarding(a)).rejects.toThrow('link failed');
    expect(a.createProfile).not.toHaveBeenCalled();
  });
  it('requires an authenticated user id', async () => {
    const a = args({ userId: '' });
    await expect(completeOwnedOnboarding(a)).rejects.toThrow('Sign in');
    expect(a.createProfile).not.toHaveBeenCalled();
  });
});
