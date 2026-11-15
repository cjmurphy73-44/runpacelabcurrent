import { describe, it, expect } from 'vitest';
import { feedbackReceipt } from '../feedbackReceipt.js';
describe('beta feedback receipt', () => {
  it('accepts a confirmed persisted record from either SDK response shape', () => {
    expect(feedbackReceipt({ data: { success: true, id: 'record-1' } })).toBe(true);
    expect(feedbackReceipt({ success: true, id: 'record-2' })).toBe(true);
  });
  it('does not claim delivery for missing IDs, errors or truthy success strings', () => {
    for (const response of [undefined, null, {}, { success: true }, { success: 'true', id: 'x' }, { data: { success: false, id: 'x' } }, { data: { success: true, id: '  ' } }]) {
      expect(feedbackReceipt(response)).toBe(false);
    }
  });
});
