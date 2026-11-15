import { describe, expect, it } from 'vitest';
import { configuredOAuthRedirect } from '../../../base44/shared/oauthRedirect';

describe('explicit OAuth callback configuration', () => {
  it('preserves the independently configured public callback', () => {
    expect(configuredOAuthRedirect('https://isolated.example.test/functions/corosSync', 'corosSync')).toBe('https://isolated.example.test/functions/corosSync');
  });
  it.each(['', ' https://example.test/functions/corosSync', 'http://example.test/functions/corosSync',
    'https://user:password@example.test/functions/corosSync', 'https://example.test/functions/corosSync?provider=other',
    'https://example.test/functions/corosSync#fragment', 'https://base44-dispatcher-production.base44.workers.dev/functions/corosSync',
    'https://localhost/functions/corosSync', 'https://127.0.0.1/functions/corosSync', 'https://example.test/functions/wearableOAuthSync',
  ])('rejects absent, internal or mismatched callback: %s', (value) => {
    expect(() => configuredOAuthRedirect(value, 'corosSync')).toThrow('callback address');
  });
});
