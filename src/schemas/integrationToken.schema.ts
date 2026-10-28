import { z } from 'zod';

export const IntegrationTokenSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  provider: z.string(),
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.string(),
  updatedAt: z.string(),
});

export type IntegrationToken = z.infer<typeof IntegrationTokenSchema>;
