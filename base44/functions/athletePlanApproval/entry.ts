import { createClientFromRequest } from 'npm:@base44/sdk@0.8.63';
import { handleAthletePlanApproval } from '../../shared/athletePlanApproval.ts';

// Disabled for ordinary users until staging concurrency/readback acceptance.
// Never enable in public production without an atomic/lease or safe serial writer.
Deno.serve((req: Request) => handleAthletePlanApproval(
  createClientFromRequest(req), req, undefined,
  Deno.env.get('ATHLETE_APPROVED_PLAN_WRITES_ENABLED') === 'true',
));
