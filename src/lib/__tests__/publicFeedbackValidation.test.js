import { describe, expect, it } from 'vitest';
import { validatePublicFeedback } from '../../../base44/shared/publicFeedbackValidation.js';

describe('public feedback validation before service-role write', () => {
  it('accepts anonymous support and retains the public billing/account categories as other', () => {
    expect(validatePublicFeedback({
      feedback_type: 'billing',
      message: '  I need help cancelling  ',
      route: '/support',
    })).toEqual({
      ok: true,
      data: { feedback_type: 'other', message: 'I need help cancelling', route: '/support' },
    });
    expect(validatePublicFeedback({
      feedback_type: 'idea', message: 'Improvement', contact_email: '  athlete@example.com ',
    })).toEqual({
      ok: true,
      data: { feedback_type: 'idea', message: 'Improvement', contact_email: 'athlete@example.com' },
    });
  });

  it('rejects empty or oversized messages without truncating them silently', () => {
    for (const message of ['', '   ', 'X'.repeat(4001), 42]) {
      const result = validatePublicFeedback({ message });
      expect(result).toMatchObject({ ok: false, status: 400 });
      expect(result.data).toBeUndefined();
    }
    expect(validatePublicFeedback({ message: 'X'.repeat(4000) }).ok).toBe(true);
  });

  it('rejects oversized or non-string email and route fields', () => {
    for (const payload of [
      { message: 'hi', contact_email: 'x'.repeat(201) },
      { message: 'hi', contact_email: { injected: true } },
      { message: 'hi', route: 'x'.repeat(301) },
      { message: 'hi', route: ['unsafe'] },
    ]) {
      expect(validatePublicFeedback(payload).ok).toBe(false);
    }
  });

  it('rejects non-object payloads and maps unrecognized category to schema-safe other', () => {
    for (const value of [null, [], 'hi', 3]) {
      expect(validatePublicFeedback(value).ok).toBe(false);
    }
    expect(validatePublicFeedback({ feedback_type: 'random', message: 'help' })).toEqual({
      ok: true, data: { feedback_type: 'other', message: 'help' },
    });
  });
});
