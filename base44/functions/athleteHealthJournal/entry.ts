import { createClientFromRequest } from 'npm:@base44/sdk@0.8.63';
import { handleAthleteHealthJournal } from '../../shared/athleteHealthJournal.ts';

// Disabled by default. First deploy to private staging, validate owner-only access,
// consent, deletion and non-disclosure, then explicitly enable in that environment.
Deno.serve((req: Request) =>
  handleAthleteHealthJournal(
    createClientFromRequest(req),
    req,
    Deno.env.get('ATHLETE_HEALTH_JOURNAL_ENABLED') === 'true',
  )
);
