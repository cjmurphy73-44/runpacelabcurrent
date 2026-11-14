import { describe, expect, it } from 'vitest';
import { supportReceiptCopy } from '../supportReceiptCopy';

describe('support submission receipt', () => {
  it('does not promise a reply when email is missing', () => {
    const receipt = supportReceiptCopy('');
    expect(receipt.confirmation).toContain('cannot reply by email');
    expect(receipt.toast).toContain('without a reply address');
  });
  it('does not promise a deadline or guaranteed response when email exists', () => {
    const receipt = supportReceiptCopy('runner@example.com');
    expect(receipt.confirmation).toContain('may contact');
    expect(receipt.toast).toContain('not guaranteed');
    expect(JSON.stringify(receipt)).not.toContain('runner@example.com');
  });
  it('handles null and whitespace contact details as absent', () => {
    expect(supportReceiptCopy(null).confirmation).toContain('cannot reply');
    expect(supportReceiptCopy('  ').confirmation).toContain('cannot reply');
  });
});
