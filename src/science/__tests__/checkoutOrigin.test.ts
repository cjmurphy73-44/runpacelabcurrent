import { describe, expect, it } from 'vitest';
import { approvedCheckoutOrigin } from '../../../base44/shared/checkoutOrigin';
const allowed = 'https://trainpacelab.com, https://trainpacelab.base44.app';
describe('checkout return origin allowlist', () => {
  it('accepts only exact configured HTTPS origins', () => {
    expect(approvedCheckoutOrigin('https://trainpacelab.com/', allowed)).toBe('https://trainpacelab.com');
    expect(approvedCheckoutOrigin('https://trainpacelab.base44.app', allowed)).toBe('https://trainpacelab.base44.app');
  });
  it('rejects spoofed suffixes, subdomains and alternate ports', () => {
    for (const candidate of ['https://trainpacelab.com.evil.test', 'https://evil.trainpacelab.com', 'https://trainpacelab.com:444']) {
      expect(approvedCheckoutOrigin(candidate, allowed)).toBeNull();
    }
  });
  it('rejects credentials, injected paths, fragments, HTTP and control whitespace', () => {
    for (const candidate of ['https://user@trainpacelab.com', 'https://trainpacelab.com/redirect', 'https://trainpacelab.com?next=x', 'https://trainpacelab.com/#x', 'http://trainpacelab.com', 'https://trainpacelab.com\\n']) {
      expect(approvedCheckoutOrigin(candidate, allowed)).toBeNull();
    }
  });
  it('fails closed when allowlist missing or malformed', () => {
    expect(approvedCheckoutOrigin('https://trainpacelab.com', '')).toBeNull();
    expect(approvedCheckoutOrigin('https://trainpacelab.com', 'http://trainpacelab.com')).toBeNull();
  });
});
