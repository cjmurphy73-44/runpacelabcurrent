/**
 * Privacy-minimal conversion funnel event factory.
 * Deliberately does not transmit events or access athlete records.
 * Only an explicit event name and allowlisted, bounded categorical values survive.
 */
const ALLOWED = Object.freeze({
  landing_viewed: { surface: ['landing', 'pricing'] },
  signup_started: { method: ['email', 'oauth', 'unknown'] },
  signup_completed: { method: ['email', 'oauth', 'unknown'] },
  device_connection_started: { provider: ['garmin', 'coros', 'other'] },
  device_connection_result: {
    provider: ['garmin', 'coros', 'other'],
    outcome: ['verified', 'failed', 'uncertain'],
  },
  first_session_result: { provenance: ['verified_stream', 'summary', 'unverified'] },
  coaching_action: { action: ['viewed', 'accepted', 'dismissed'] },
  checkout_started: { tier: ['pro', 'unlimited', 'coach_pro'] },
  checkout_returned: { outcome: ['returned', 'cancelled', 'unknown'] },
});
export const FUNNEL_EVENT_NAMES = Object.freeze(Object.keys(ALLOWED));

/**
 * @param {string} eventName
 * @param {Record<string, unknown>} properties
 * @returns {{name:string,properties:Record<string,string>} | null}
 * null indicates invalid event input. Never forward the original properties.
 */
export function makeFunnelEvent(eventName, properties = {}) {
  if (typeof eventName !== 'string' || !Object.hasOwn(ALLOWED, eventName)) return null;
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) return null;
  const schema = ALLOWED[eventName];
  const sanitized = Object.create(null);
  for (const [field, choices] of Object.entries(schema)) {
    if (!Object.hasOwn(properties, field) || !choices.includes(properties[field])) return null;
    sanitized[field] = properties[field];
  }
  return { name: eventName, properties: sanitized };
}
