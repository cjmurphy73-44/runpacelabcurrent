import { z } from 'zod';
import { calculateHeartRateZones, calculatePaceZones } from '../../../math/zones';

// Request Body Validation Schema
const ZonesRequestSchema = z
  .object({
    maxHr: z
      .number({ invalid_type_error: 'maxHr must be a number' })
      .min(100, 'maxHr must be at least 100 bpm')
      .max(240, 'maxHr must be at most 240 bpm')
      .optional(),
    restingHr: z
      .number({ invalid_type_error: 'restingHr must be a number' })
      .min(30, 'restingHr must be at least 30 bpm')
      .max(120, 'restingHr must be at most 120 bpm')
      .optional(),
    thresholdPaceSecPerKm: z
      .number({ invalid_type_error: 'thresholdPaceSecPerKm must be a number' })
      .positive('thresholdPaceSecPerKm must be positive')
      .optional(),
    vdot: z
      .number({ invalid_type_error: 'vdot must be a number' })
      .min(15, 'VDOT must be at least 15')
      .max(85, 'VDOT must be at most 85')
      .optional(),
  })
  .refine(
    (data) => data.maxHr !== undefined || data.thresholdPaceSecPerKm !== undefined || data.vdot !== undefined,
    {
      message: 'At least one zone input parameter (maxHr, thresholdPaceSecPerKm, or vdot) must be provided.',
    }
  );

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validationResult = ZonesRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return Response.json(
        {
          error: 'Validation Error',
          details: validationResult.error.errors.map((err) => ({
            field: err.path.join('.') || 'root',
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const { maxHr, restingHr, thresholdPaceSecPerKm, vdot } = validationResult.data;

    const responseData: Record<string, any> = {};

    // Heart Rate Zones (Karvonen formula if restingHr provided, otherwise %Max HR)
    if (maxHr !== undefined) {
      responseData.heartRateZones = calculateHeartRateZones(maxHr, restingHr);
    }

    // Pace Zones
    if (thresholdPaceSecPerKm !== undefined || vdot !== undefined) {
      responseData.paceZones = calculatePaceZones({ thresholdPaceSecPerKm, vdot });
    }

    return Response.json(
      {
        success: true,
        data: responseData,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return Response.json(
      {
        error: 'Internal Server Error',
        message: error.message || 'An unexpected error occurred.',
      },
      { status: 500 }
    );
  }
}
