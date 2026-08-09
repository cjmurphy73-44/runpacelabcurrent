// src/lib/telemetry/WebhookHandler.ts
import { sanitize } from "./TelemetryParser.ts";

/**
 * Normalizes incoming webhook payloads from various athletic providers
 * (e.g., Strava, Garmin, Wahoo) into a unified format for our ingest pipeline.
 */

export interface NormalizedTelemetry {
  provider: string;
  externalId: string;
  rawPayload: any;
  normalizedAt: string;
  // Common fields for our ingest pipeline
  startTime: string;
  durationSeconds: number;
  sportType: string;
  tss?: number;
}

export class WebhookHandler {
  /**
   * Processes and validates an incoming raw webhook payload.
   */
  static handle(provider: string, payload: any): NormalizedTelemetry | null {
    console.log(`[WebhookHandler] Processing event from ${provider}`);

    try {
      const adapter = this.getAdapter(provider);
      const normalized = adapter(payload);
      
      // Perform final sanitation using shared logic
      return sanitize(normalized);
    } catch (error) {
      console.error(`[WebhookHandler] Failed to normalize ${provider} payload:`, error);
      return null;
    }
  }

  private static getAdapter(provider: string) {
    switch (provider.toLowerCase()) {
      case 'strava':
        return this.stravaAdapter;
      case 'garmin':
        return this.garminAdapter;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  private static stravaAdapter(payload: any): NormalizedTelemetry {
    // Maps Strava activity webhook schema to our internal schema
    return {
      provider: 'strava',
      externalId: String(payload.object_id),
      rawPayload: payload,
      normalizedAt: new Date().toISOString(),
      startTime: new Date(payload.event_time * 1000).toISOString(),
      durationSeconds: payload.elapsed_time || 0,
      sportType: payload.type || 'running',
      tss: undefined
    };
  }

  private static garminAdapter(payload: any): NormalizedTelemetry {
    // Maps Garmin Health API schema to our internal schema
    return {
      provider: 'garmin',
      externalId: String(payload.id),
      rawPayload: payload,
      normalizedAt: new Date().toISOString(),
      startTime: payload.startTime,
      durationSeconds: payload.durationSeconds || 0,
      sportType: payload.sportType || 'running',
      tss: undefined
    };
  }
}
