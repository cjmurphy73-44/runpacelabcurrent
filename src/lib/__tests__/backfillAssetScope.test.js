import { describe, expect, it } from 'vitest';
import { eligibleBackfillAssets } from '../../../base44/shared/backfillAssetScope.ts';

describe('historical raw asset scope under service role', () => {
  const owned = { athlete_id: 'athlete-a', session_id: 'session-a', file_url: 'https://files.example.test/owned.fit' };
  it('allows a correctly bound original FIT asset', () => {
    expect(eligibleBackfillAssets([owned], 'athlete-a', 'session-a')).toEqual([owned]);
  });
  it('rejects cross-athlete, cross-session and missing ownership even if returned by filter', () => {
    const rows = [owned, { ...owned, athlete_id: 'athlete-b' },
      { ...owned, session_id: 'session-b' }, { session_id: 'session-a', file_url: owned.file_url },
      { ...owned, file_url: null }];
    expect(eligibleBackfillAssets(rows, 'athlete-a', 'session-a')).toEqual([owned]);
  });
  it('fails closed on malformed queries and responses', () => {
    expect(eligibleBackfillAssets(null, 'athlete-a', 'session-a')).toEqual([]);
    expect(eligibleBackfillAssets([owned], '', 'session-a')).toEqual([]);
    expect(eligibleBackfillAssets([owned], 'athlete-a', '')).toEqual([]);
  });
});
