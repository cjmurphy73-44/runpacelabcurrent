import { z } from 'zod';

export const WebhookLogSchema = z.object({
  id: z.string().optional(),
  provider: z.string(),
  payloadType: z.string(),
  data: z.record(z.any()),
  processed: z.boolean(),
  createdAt: z.string(),
});

export type WebhookLog = z.infer<typeof WebhookLogSchema>;
