import { z } from 'zod';
import { adjustPaceForEnvironment } from '../../../math/environmental';

// Zod Schema for Environmental Weather Pace Adjustment Request
const WeatherAdjustSchema = z.object({
  targetPaceSecondsPerKm: z
    .number({ invalid_type_error: 'targetPaceSecondsPerKm must be a number' })
    .positive('targetPaceSecondsPerKm must be a positive number'),
  temperatureC: z
    .number({ invalid_type_error: 'temperatureC must be a number' })
    .min(-50, 'temperatureC cannot be lower than -50°C')
    .max(60, 'temperatureC cannot be higher than 60°C'),
  relativeHumidity: z
    .number({ invalid_type_error: 'relativeHumidity must be a number' })
    .min(0, 'relativeHumidity must be at least 0%')
    .max(100, 'relativeHumidity must be at most 100%'),
  altitudeMeters: z
    .number({ invalid_type_error: 'altitudeMeters must be a number' })
    .min(0, 'altitudeMeters must be non-negative')
    .max(9000, 'altitudeMeters cannot exceed 9000m')
    .optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validationResult = WeatherAdjustSchema.safeParse(body);
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

    const { targetPaceSecondsPerKm, temperatureC, relativeHumidity, altitudeMeters } =
      validationResult.data;

    const result = adjustPaceForEnvironment(targetPaceSecondsPerKm, {
      temperatureC,
      relativeHumidity,
      altitudeMeters,
    });

    return Response.json(
      {
        success: true,
        data: result,
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
