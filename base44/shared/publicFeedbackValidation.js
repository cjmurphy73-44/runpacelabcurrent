/**
 * Validate unauthenticated support submissions before any service-role write.
 * Only allow the fields displayed by the public support and feedback forms.
 * This does not replace a distributed rate limiter or CAPTCHA.
 */
export function validatePublicFeedback(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, status: 400, error: 'Invalid feedback submission' };
  }
  if (typeof input.message !== 'string' || !input.message.trim() ||
      input.message.length > 4000) {
    return { ok: false, status: 400, error: 'Message must be 1 to 4000 characters' };
  }
  if (input.contact_email !== undefined &&
      (typeof input.contact_email !== 'string' || input.contact_email.length > 200)) {
    return { ok: false, status: 400, error: 'Invalid contact email' };
  }
  if (input.route !== undefined &&
      (typeof input.route !== 'string' || input.route.length > 300)) {
    return { ok: false, status: 400, error: 'Invalid route' };
  }
  const allowed = new Set(['bug', 'idea', 'other', 'billing', 'account']);
  const feedback_type = input.feedback_type == null ? 'bug' :
    allowed.has(input.feedback_type) ? input.feedback_type : 'other';
  // BetaFeedback's existing schema allows only bug/idea/other. Preserve the
  // supported public categories without changing the storage schema.
  const storedType = feedback_type === 'idea' ? 'idea'
    : feedback_type === 'bug' ? 'bug' : 'other';
  return {
    ok: true,
    data: {
      feedback_type: storedType,
      message: input.message.trim(),
      ...(input.contact_email?.trim() ? { contact_email: input.contact_email.trim() } : {}),
      ...(input.route?.trim() ? { route: input.route.trim() } : {}),
    },
  };
}
