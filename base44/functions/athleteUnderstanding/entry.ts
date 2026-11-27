import { createClientFromRequest } from 'npm:@base44/sdk@0.8.63';
import { handleAthleteUnderstanding } from '../../shared/athleteUnderstanding.ts';

// Read-only. No AI invocation, private health diary access or persistence writes.
Deno.serve((req: Request) => handleAthleteUnderstanding(createClientFromRequest(req), req));
