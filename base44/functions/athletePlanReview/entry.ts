import { createClientFromRequest } from 'npm:@base44/sdk@0.8.63';
import { handleAthletePlanReview } from '../../shared/athletePlanReview.ts';

// On-demand only: an athlete reviews evidence and must separately confirm.
// No AI, health-journal reads, automatic plan updates or scheduled writes.
Deno.serve((req: Request) => handleAthletePlanReview(createClientFromRequest(req), req));