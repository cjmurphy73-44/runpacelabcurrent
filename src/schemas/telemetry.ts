import { z } from 'zod';

export const StreamSummarySchema = z.object({
  activityId: z.string().uuid(),
  athleteId: z.string().uuid(),
  startTime: z.string().datetime(),
  durationSeconds: z.number(),
  averageHeartRate: z.number().optional(),
  maxHeartRate: z.number().optional(),
  averagePower: z.number().optional(),
  maxPower: z.number().optional(),
  totalDistanceMeters: z.number().optional(),
});

export type StreamSummary = z.infer<typeof StreamSummarySchema>;

export const StreamDataPointSchema = z.object({
  timestamp: z.number(),
  heartRate: z.number().optional(),
  power: z.number().optional(),
  cadence: z.number().optional(),
  speed: z.number().optional(),
});

export type StreamDataPoint = z.infer<typeof StreamDataPointSchema>;
