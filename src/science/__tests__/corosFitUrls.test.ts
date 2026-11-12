import { describe, expect, it } from 'vitest';
import { fitUrlsFromText } from '../../../base44/shared/corosFitUrls';

describe('COROS FIT URL parsing', () => {
  it('preserves the entire signed query required to download original FIT', () => {
    const signed = 'https://files.coros.com/workouts/123.fit?X-Amz-Expires=600&X-Amz-Signature=abc123';
    expect(fitUrlsFromText('Activity.fit\n' + signed)).toEqual([signed]);
  });

  it('deduplicates repeated signed links without stripping credentials', () => {
    const signed = 'https://files.coros.com/recording.fit?token=abc&exp=123';
    expect(fitUrlsFromText(signed + '\n' + signed)).toEqual([signed]);
  });

  it('rejects non-FIT and non-HTTPS URLs', () => {
    expect(fitUrlsFromText('http://files.coros.com/a.fit https://files.coros.com/a.csv')).toEqual([]);
  });

  it('ignores malformed input and keeps valid paths case-insensitively', () => {
    expect(fitUrlsFromText(null as unknown as string)).toEqual([]);
    expect(fitUrlsFromText('https://files.coros.com/A.FIT?token=signed')).toEqual([
      'https://files.coros.com/A.FIT?token=signed',
    ]);
  });
});
