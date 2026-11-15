import { describe, expect, it } from 'vitest';
import { validateFeedbackPayload } from '../../../base44/shared/feedbackValidation.js';

describe('public feedback validation', () => {
  const valid = { feedback_type: 'bug', message: 'App failed on import', route: '/support' };
  it('accepts trimmed feedback and optional reply email', () => {
    expect(validateFeedbackPayload({ ...valid, message: '  hello  ', contact_email: ' user@example.com ' }))
      .toMatchObject({ ok: true, value: { message: 'hello', contact_email: 'user@example.com' } });
  });
  it('rejects non-string, empty and oversized messages', () => {
    for (const message of [null, {}, '   ', 'x'.repeat(4001)]) {
      expect(validateFeedbackPayload({ ...valid, message }).ok).toBe(false);
    }
  });
  it('rejects malformed emails and unexpected routes', () => {
    for (const contact_email of ['bad', 'x'.repeat(201) + '@a.com', { email: 'x@y.com' }]) {
      expect(validateFeedbackPayload({ ...valid, contact_email }).ok).toBe(false);
    }
    for (const route of ['https://example.com', '//evil', '/support?token=secret', '/a#secret']) {
      expect(validateFeedbackPayload({ ...valid, route }).ok).toBe(false);
    }
  });
  it('rejects unknown category rather than silently recording a bug', () => {
    expect(validateFeedbackPayload({ ...valid, feedback_type: 'admin' }).ok).toBe(false);
  });
  it('accepts public billing/account categories without changing entity schema', () => {
    expect(validateFeedbackPayload({ ...valid, feedback_type: 'billing' }).value.feedback_type).toBe('other');
    expect(validateFeedbackPayload({ ...valid, feedback_type: 'account' }).value.feedback_type).toBe('other');
  });
});
