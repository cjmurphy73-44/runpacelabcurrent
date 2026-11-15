// Shared pure boundary for public feedback. Do not log raw submissions.
const TYPES = new Set(['bug', 'idea', 'other', 'billing', 'account']);
const MAX_MESSAGE = 4000;
const MAX_EMAIL = 200;
const MAX_ROUTE = 300;

export function validateFeedbackPayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'Invalid submission' };
  if (typeof body.message !== 'string') return { ok: false, error: 'Message is required' };
  const message = body.message.trim();
  if (!message || message.length > MAX_MESSAGE) return { ok: false, error: 'Message must be 1 to 4000 characters' };
  if (typeof body.feedback_type !== 'string' || !TYPES.has(body.feedback_type)) return { ok: false, error: 'Invalid feedback category' };
  let contact_email;
  if (body.contact_email != null && body.contact_email !== '') {
    if (typeof body.contact_email !== 'string') return { ok: false, error: 'Invalid email address' };
    contact_email = body.contact_email.trim();
    if (contact_email.length > MAX_EMAIL || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email)) {
      return { ok: false, error: 'Invalid email address' };
    }
  }
  let route;
  if (body.route != null && body.route !== '') {
    if (typeof body.route !== 'string' || body.route.length > MAX_ROUTE ||
        !/^\/[a-zA-Z0-9/_-]*$/.test(body.route) || body.route.startsWith('//')) {
      return { ok: false, error: 'Invalid route' };
    }
    route = body.route;
  }
  // The BetaFeedback entity's category vocabulary is bug/idea/other.
  // Keep billing/account distinction in the route-neutral message category until
  // an explicit schema migration is reviewed.
  return { ok: true, value: {
    feedback_type: ['billing', 'account'].includes(body.feedback_type) ? 'other' : body.feedback_type,
    message, ...(contact_email ? { contact_email } : {}), ...(route ? { route } : {}),
  } };
}
