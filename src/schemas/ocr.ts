import { z } from 'zod';

export const OcrExtractionSchema = z.object({
  confidence: z.number().min(0).max(1),
  sportType: z
    .enum(['running', 'trail_running', 'treadmill', 'cycling', 'swimming', 'other'])
    .default('running'),
  distanceMeters: z.number().positive('Distance must be a positive number'),
  durationSeconds: z.number().positive('Duration must be a positive number'),
  avgHeartRate: z.number().int().positive().optional(),
  maxHeartRate: z.number().int().positive().optional(),
  avgPaceSecondsPerKm: z.number().positive().optional(),
  totalElevationGainMeters: z.number().min(0).optional(),
  avgCadence: z.number().int().positive().optional(),
  calories: z.number().positive().optional(),
  timestamp: z.string().datetime({ message: 'Invalid ISO timestamp' }).optional(),
  rawText: z.string().optional(),
});

export type OcrExtraction = z.infer<typeof OcrExtractionSchema>;
