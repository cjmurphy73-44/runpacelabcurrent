import { prisma } from '../prisma';
import { calculateMetrics } from './loadEngine';

export async function updateAthleteMetrics(userId: string) {
  // 1. Get last 42 days of workouts
  const fortyTwoDaysAgo = new Date();
  fortyTwoDaysAgo.setDate(fortyTwoDaysAgo.getDate() - 42);

  const workouts = await prisma.activityHistory.findMany({
    where: {
      userId,
      createdAt: { gte: fortyTwoDaysAgo },
    },
  });

  // 2. Extract TSS (assuming details has a 'tss' field)
  const tssValues = workouts.map(w => (w.details as any).tss || 0);

  // 3. Calculate new metrics
  const { ctl, atl, tsb } = calculateMetrics(tssValues);

  // 4. Update/Upsert metrics record
  await prisma.athleteDailyMetrics.upsert({
    where: { id: userId }, // This is a placeholder; need a composite key or ID mapping
    update: { ctl, atl, tsb },
    create: {
      userId,
      ctl,
      atl,
      tsb,
    },
  });
}
