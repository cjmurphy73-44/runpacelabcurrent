import { z } from 'zod';
import { calculateVDOT, getEquivalentTimes, getTrainingPaces } from '../../../math/vdot';

const VdotRequestSchema = z.object({
  distanceMeters: z
    .number({ invalid_type_error: 'distanceMeters must be a number' })
    .positive('distanceMeters must be greater than 0'),
  timeSeconds: z
    .number({ invalid_type_error: 'timeSeconds must be a number' })
    .positive('timeSeconds must be greater than 0'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validationResult = VdotRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return Response.json(
        {
          error: 'Validation Error',
          details: validationResult.error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const { distanceMeters, timeSeconds } = validationResult.data;

    const vdot = calculateVDOT(timeSeconds, distanceMeters);
    const trainingPaces = getTrainingPaces(vdot);
    const equivalentTimes = getEquivalentTimes(vdot);

    return Response.json(
      {
        success: true,
        data: {
          vdot: Number(vdot.toFixed(2)),
          equivalentTimes,
          trainingPaces,
        },
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
