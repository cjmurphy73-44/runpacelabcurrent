import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const segmentSchema = z.object({
  segment: z.string(),
  timeSeconds: z.number().int().positive(),
  formattedTime: z.string(),
});

const pbInputSchema = z.object({
  distanceName: z.string().min(1),
  distanceMeters: z.number().positive(),
  timeSeconds: z.number().int().positive(),
  formattedTime: z.string(),
  dateAchieved: z.string(), // ISO date string
  segments: z.array(segmentSchema).optional(),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    // Fetch all PBs sorted by distance
    const pbs = await db.personalBest.findMany({
      orderBy: { distanceMeters: 'asc' },
    });

    return NextResponse.json({ success: true, data: pbs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = pbInputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid PB parameters', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { distanceName, distanceMeters, timeSeconds, formattedTime, dateAchieved, segments, notes } = validation.data;

    const newPb = await db.personalBest.create({
      data: {
        distanceName,
        distanceMeters,
        timeSeconds,
        formattedTime,
        dateAchieved: new Date(dateAchieved),
        segments: segments ? JSON.parse(JSON.stringify(segments)) : undefined,
        notes,
      },
    });

    return NextResponse.json({ success: true, data: newPb });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
