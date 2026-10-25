export const prisma: any = {
  workoutSession: { findMany: async (..._args: any[]) => [], create: async (..._args: any[]) => ({}) },
  activityHistory: { 
    findMany: async (..._args: any[]) => [], 
    create: async (..._args: any[]) => ({}),
    bulkCreate: async (..._args: any[]) => [],
    updateMany: async (..._args: any[]) => ({}),
    deleteMany: async (..._args: any[]) => ({})
  },
  athleteDailyMetrics: { 
    upsert: async (..._args: any[]) => ({}),
    findMany: async (..._args: any[]) => []
  },
  coachMessage: {
    bulkCreate: async (..._args: any[]) => [],
    updateMany: async (..._args: any[]) => [],
    deleteMany: async (..._args: any[]) => []
  }
};
