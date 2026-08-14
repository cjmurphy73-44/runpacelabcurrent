import { WebhookHandler, NormalizedSession } from '../lib/telemetry/WebhookHandler';
import {
  evaluateDeduplication,
  StreamSourcePriority,
  ExistingActivity,
  DeduplicationResult,
} from '../services/deduplication';

export interface StravaVerificationQuery {
  'hub.mode'?: string;
  'hub.challenge'?: string;
  'hub.verify_token'?: string;
}

export interface IngestionResponse {
  success: boolean;
  message: string;
  session?: NormalizedSession | null;
  deduplication?: DeduplicationResult;
}

/**
 * Handles Strava's initial GET verification challenge during webhook setup.
 */
export function verifyStravaWebhook(
  query: StravaVerificationQuery,
  expectedVerifyToken: string
): { status: number; body: { 'hub.challenge': string } | { error: string } } {
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];

  if (mode === 'subscribe' && token === expectedVerifyToken && challenge) {
    return {
      status: 200,
      body: { 'hub.challenge': challenge },
    };
  }

  return {
    status: 403,
    body: { error: 'Invalid verification token or parameters' },
  };
}

/**
 * Processes incoming Strava webhook POST events, normalizes session data,
 * and runs deduplication checks.
 */
export function processStravaWebhook(
  payload: Record<string, any>,
  existingActivities: ExistingActivity[] = []
): IngestionResponse {
  const session = WebhookHandler.handle('strava', payload);

  if (!session) {
    return {
      success: false,
      message: 'Failed to normalize Strava payload (invalid or missing required fields)',
    };
  }

  const candidate = {
    userId: payload.owner_id ? String(payload.owner_id) : 'unknown_user',
    externalActivityId: session.externalId,
    startTime: session.startTime,
    distanceMeters: (payload.distance_km || 0) * 1000,
    durationSeconds: session.durationSeconds,
    streamSourcePriority: StreamSourcePriority.FITNESS_HUB,
    provider: 'strava',
  };

  const deduplication = evaluateDeduplication(candidate, existingActivities);

  return {
    success: true,
    message: `Strava event processed: ${deduplication.action}`,
    session,
    deduplication,
  };
}

/**
 * Processes incoming Garmin webhook POST events, normalizes session data,
 * and runs deduplication checks.
 */
export function processGarminWebhook(
  payload: Record<string, any>,
  existingActivities: ExistingActivity[] = []
): IngestionResponse {
  const session = WebhookHandler.handle('garmin', payload);

  if (!session) {
    return {
      success: false,
      message: 'Failed to normalize Garmin payload (invalid or missing required fields)',
    };
  }

  const candidate = {
    userId: payload.userId ? String(payload.userId) : 'unknown_user',
    externalActivityId: session.externalId,
    startTime: session.startTime,
    distanceMeters: payload.distanceMeters || (payload.distance_km || 0) * 1000,
    durationSeconds: session.durationSeconds,
    streamSourcePriority: StreamSourcePriority.DIRECT_WEARABLE_API,
    provider: 'garmin',
  };

  const deduplication = evaluateDeduplication(candidate, existingActivities);

  return {
    success: true,
    message: `Garmin event processed: ${deduplication.action}`,
    session,
    deduplication,
  };
}
