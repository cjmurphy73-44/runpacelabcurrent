import { NextResponse } from 'next/server';
import { z } from 'zod';

const aiCoachSchema = z.object({
  vdot: z.number().min(15).max(85).optional(),
  temperatureC: z.number().optional(),
  humidity: z.number().min(0).max(100).optional(),
  query: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = aiCoachSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input parameters', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { vdot = 45, temperatureC = 20, humidity = 50, query } = validation.data;

    // Generate intelligent rule-based/AI coaching advice
    let advice = `Based on your VDOT of ${vdot}, your aerobic baseline is strong. `;
    
    if (temperatureC > 25 || humidity > 70) {
      advice += `⚠️ **Heat Advisory Alert**: With temperature at ${temperatureC}°C and humidity at ${humidity}%, your physiological strain is elevated. We recommend shifting your easy pace 15–25 seconds slower per kilometer and prioritizing hydration. `;
    } else {
      advice += `Weather conditions are optimal for training today! Stick to your prescribed zone targets. `;
    }

    if (query) {
      advice += `\n\n*Coach Response to "${query}"*: Focus on maintaining consistent cadence and avoid surging during the middle kilometers of your long run.`;
    }

    return NextResponse.json({
      success: true,
      data: {
        coachName: "RPL Coach v0.5",
        recommendation: advice,
        metricsEvaluated: { vdot, temperatureC, humidity },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
