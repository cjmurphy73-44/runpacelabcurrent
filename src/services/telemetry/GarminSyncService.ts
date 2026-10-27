import { GarminAdapter } from './GarminAdapter';
import { TelemetryIngestionEngine } from '../../lib/telemetry/TelemetryIngestionEngine';

export const GarminSyncService = {
  async processWebhookActivity(rawWebhookPayload: any) {
    try {
      const normalizedWorkout = GarminAdapter.normalizeActivity(rawWebhookPayload);
      const engine = new TelemetryIngestionEngine();
      const ingestionResult = await engine.processWorkout(normalizedWorkout as any);

      return { 
        success: true, 
        sessionId: normalizedWorkout.sessionId,
        dominantFormat: ingestionResult.dominantSourceFormat 
      };
    } catch (err) {
      console.error('Error processing Garmin webhook activity:', err);
      throw err;
    }
  }
};
