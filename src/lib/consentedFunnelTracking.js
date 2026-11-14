import { makeFunnelEvent } from './funnelEvents.js';

/**
 * Consent-gated adapter for the existing Base44 analytics client.
 * Caller must supply affirmative consent; no persistent queue or implicit opt-in.
 * The event factory strips arbitrary athlete identifiers and sensitive properties.
 */
export function trackConsentedFunnelEvent({ consent, analytics, name, properties }) {
  if (consent !== true || typeof analytics?.track !== 'function') return false;
  const event = makeFunnelEvent(name, properties);
  if (!event) return false;
  try {
    analytics.track({ eventName: event.name, properties: { ...event.properties } });
    return true;
  } catch {
    return false; // Analytics must never interrupt onboarding.
  }
}
