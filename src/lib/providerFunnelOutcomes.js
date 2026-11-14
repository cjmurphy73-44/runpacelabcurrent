import { trackConsentedFunnelEvent } from './consentedFunnelTracking.js';

/**
 * Only server-confirmed provider status counts as a verified connection.
 * OAuth URL creation, popup focus, and redirect are not verification.
 * Unknown/expired/error states are deliberately uncertain.
 */
export function classifyProviderConnection(status) {
  if (!status || typeof status !== 'object' || Array.isArray(status)) return 'uncertain';
  if (status.unknown === true || status.needs_reconnect === true || status.error || status.last_error) return 'uncertain';
  if (status.connected === true) return 'verified';
  if (status.connected === false) return 'failed';
  return 'uncertain';
}

export function recordProviderConnectionStatus({ consent, analytics, provider, status }) {
  if (provider !== 'garmin' && provider !== 'coros') return false;
  return trackConsentedFunnelEvent({
    consent, analytics, name: 'device_connection_result',
    properties: { provider, outcome: classifyProviderConnection(status) },
  });
}
