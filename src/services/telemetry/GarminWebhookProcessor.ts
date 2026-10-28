import { GarminAdapter } from './GarminAdapter';

export interface WebhookLogEntry {
  id: string;
  provider: string;
  payloadType: string;
  data: Record<string, any>;
  processed: boolean;
  createdAt: string;
}

export class GarminWebhookProcessor {
  /**
   * Transforms a raw Garmin webhook activity payload into standard TelemetryActivity form.
   */
  public processActivityPayload(log: WebhookLogEntry) {
    if (log.provider !== 'garmin' || log.payloadType !== 'activity') {
      throw new Error(`Unsupported webhook payload type: ${log.provider}/${log.payloadType}`);
    }

    const rawData = log.data;
    const normalizedActivity = GarminAdapter.normalizeActivity(rawData);

    return {
      logId: log.id,
      activity: {
        provider: 'garmin',
        distanceMeters: normalizedActivity.distanceMeters,
        durationSeconds: (normalizedActivity.durationMinutes || 0) * 60,
      },
      processedAt: new Date().toISOString(),
    };
  }
}
