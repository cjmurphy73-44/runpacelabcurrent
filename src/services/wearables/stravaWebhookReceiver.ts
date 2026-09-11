import { Request, Response } from 'express';

const STRAVA_VERIFY_TOKEN = process.env.VITE_STRAVA_VERIFY_TOKEN || 'trainpacelab_verify_token';

export interface StandardizedTelemetryPayload {
  activityId: string;
  source: 'strava';
  athleteId: string;
  elapsedTimeSeconds: number;
  movingTimeSeconds: number;
  distanceMeters: number;
  elevationGainMeters: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  timestamp: number;
}

/**
 * Handles Strava webhook subscription verification (GET request with `hub.challenge`).
 */
export function handleStravaWebhookVerification(req: Request, res: Response): void {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === STRAVA_VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED: Strava webhook subscription verified successfully.');
      res.status(200).json({ 'hub.challenge': challenge });
    } else {
      res.status(403).json({ error: 'Verification tokens do not match.' });
    }
  } else {
    res.status(400).json({ error: 'Missing parameters for webhook verification.' });
  }
}

/**
 * Normalizes an incoming Strava activity payload into the TrainPaceLab telemetry format.
 */
export function normalizeStravaActivity(event: any): StandardizedTelemetryPayload {
  const objectId = event.object_id ? event.object_id.toString() : 'unknown';
  const ownerId = event.owner_id ? event.owner_id.toString() : 'unknown';
  const updates = event.updates || {};

  return {
    activityId: objectId,
    source: 'strava',
    athleteId: ownerId,
    elapsedTimeSeconds: updates.elapsed_time ? Number(updates.elapsed_time) : 0,
    movingTimeSeconds: updates.moving_time ? Number(updates.moving_time) : 0,
    distanceMeters: updates.distance ? Number(updates.distance) : 0,
    elevationGainMeters: updates.elevation_gain ? Number(updates.elevation_gain) : 0,
    averageHeartRate: updates.average_heartrate ? Number(updates.average_heartrate) : undefined,
    maxHeartRate: updates.max_heartrate ? Number(updates.max_heartrate) : undefined,
    timestamp: event.event_time ? Number(event.event_time) : Math.floor(Date.now() / 1000),
  };
}

/**
 * Express API handler for incoming POST webhook events (`activity:create`, `activity:update`).
 */
export async function handleStravaWebhookEvent(
  req: Request,
  res: Response,
  onTelemetryIngested?: (telemetry: StandardizedTelemetryPayload) => Promise<void>
): Promise<void> {
  try {
    const event = req.body;

    // Acknowledge receipt immediately to Strava (they expect a 200 OK within 2 seconds)
    res.status(200).json({ status: 'EVENT_RECEIVED' });

    // Process relevant activity events
    if (event.aspect_type === 'create' || event.aspect_type === 'update') {
      if (event.object_type === 'activity') {
        const normalizedData = normalizeStravaActivity(event);
        console.log(`Processing Strava activity [${event.aspect_type}] for activity ID: ${normalizedData.activityId}`);

        if (onTelemetryIngested) {
          await onTelemetryIngested(normalizedData);
        }
      }
    }
  } catch (error: any) {
    console.error('Error processing Strava webhook event:', error.message);
  }
}
