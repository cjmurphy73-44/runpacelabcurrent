import { db } from '@/lib/db';

export async function updateUserProfile(email: string, data: { name?: string; vdot?: number; maxHeartRate?: number }) {
  return await db.user.upsert({
    where: { email },
    update: data,
    create: {
      email,
      ...data,
    },
  });
}

export async function logUserActivity(userId: string, type: string, details: object) {
  return await db.activityHistory.create({
    data: {
      userId,
      type,
      details: JSON.parse(JSON.stringify(details)),
    },
  });
}
