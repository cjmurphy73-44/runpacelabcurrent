import { createClientFromRequest } from 'npm:@base44/sdk@0.8.63';
import { handleApprovedPlanAdjustment } from '../../shared/approvedPlanAdjustment.ts';

// Owner-only authenticated preview and explicit approval. No AI invocation,
// no private health journal access, no automatic schedule writes.
Deno.serve((req: Request) =>
  handleApprovedPlanAdjustment(createClientFromRequest(req), req));
