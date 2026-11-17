import { describe, expect, it } from 'vitest';
import { isBackfillCandidate } from '../../../base44/shared/backfillCandidates.ts';

describe('COROS original-recording backfill eligibility', () => {
  const coros = { source_provider: 'coros', provider_activity_id: 'coros:123:4', zone_method: 'none' };
  it('recovers identifiable summary-only COROS sessions without stored file URLs', () => {
    expect(isBackfillCandidate({ ...coros, streams: [] })).toBe(true);
    expect(isBackfillCandidate({ ...coros })).toBe(true);
  });
  it('does not repeatedly scan a COROS session already holding a stream', () => {
    expect(isBackfillCandidate({ ...coros, streams: Array.from({ length: 60 }, (_, time) => ({ time })) })).toBe(false);
  });
  it('does not rescan unidentified COROS summaries or other providers', () => {
    expect(isBackfillCandidate({ source_provider: 'coros', zone_method: 'none' })).toBe(false);
    expect(isBackfillCandidate({ source_provider: 'manual', provider_activity_id: 'x' })).toBe(false);
    expect(isBackfillCandidate({ source_provider: 'garmin', provider_activity_id: 'x' })).toBe(false);
  });
  it('preserves existing file-based and legacy synthetic-zone recovery', () => {
    expect(isBackfillCandidate({ raw_file_url: 'https://example.test/a.fit' })).toBe(true);
    expect(isBackfillCandidate({ zone_method: 'average' })).toBe(true);
    expect(isBackfillCandidate({ zone_method: 'laps' })).toBe(true);
  });
  it('does not mistake missing or blank activity IDs for recoverable originals', () => {
    expect(isBackfillCandidate({ ...coros, provider_activity_id: ' ' })).toBe(false);
    expect(isBackfillCandidate(null)).toBe(false);
  });
});
