import { parseFitSummary } from '../lib/fitSummaryParser';
import { calculateVDOT } from './physiologyEngine';
import { calculateEnvironmentalStrain } from './environmentalStrain';

export class TelemetryIngestionEngine {
  static async processFile(file, weatherContext = {}) {
    // 1. Parse raw data
    const rawData = await parseFitSummary(file);

    // 2. Sanitize/Normalize
    const normalizedData = {
      ...rawData,
      duration: Math.max(0, rawData.duration || 0),
      heartRate: Math.max(0, rawData.heartRate || 0),
      timestamp: rawData.timestamp || Date.now(),
    };

    // 3. Pipeline into analytics
    const vdotResult = calculateVDOT(normalizedData.distance, normalizedData.duration);
    const strainResult = calculateEnvironmentalStrain(
      normalizedData.temperature || weatherContext.tempC,
      normalizedData.humidity || weatherContext.humidity,
      normalizedData.dewPoint || weatherContext.dewPoint
    );

    return {
      ...normalizedData,
      analytics: {
        vdot: vdotResult,
        environmentalStrain: strainResult,
      },
    };
  }
}
