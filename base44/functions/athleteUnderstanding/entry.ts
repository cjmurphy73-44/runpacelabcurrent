import { createClientFromRequest } from 'npm:@base44/sdk@0.8.63';
import { handleAthleteUnderstanding } from '../../shared/athleteUnderstanding.ts';

// Owner-only read. Does not retrieve any sensitive journal or write athlete data.
Deno.serve((req: Request) => handleAthleteUnderstanding(createClientFromRequest(req), req));
