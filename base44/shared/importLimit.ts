// base44/shared/importLimit.ts
// Server-side enforcement of the Free-tier daily file-import cap. Mirrors
// FREE_LIMITS.manualImportsPerDay in src/lib/subscriptionFeatures.ts.
// Paid plans and admins are uncapped. Counts WebhookEvent-free: uses the athlete's
// WorkoutSession rows created today with a file-based source_format.

import { assertPaidPlan } from './planGate.ts';

export const FREE_IMPORTS_PER_DAY = 10;

export async function checkImportAllowance(
  base44: any,
  user: any,
  athleteId: string,
  incoming = 1,
): Promise<{ ok: boolean; limit: number | null; used: number }> {
  const gate = await assertPaidPlan(base44, user);
  if (gate.ok) return { ok: true, limit: null, used: 0 };
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const rows = await base44.asServiceRole.entities.WorkoutSession.filter(
    { athlete_id: athleteId, created_date: { $gte: startOfDay.toISOString() } },
    '-created_date',
    500,
  );
  const used = rows.filter((s: any) => ['fit', 'tcx', 'csv'].includes(s.source_format)).length;
  return { ok: used + incoming <= FREE_IMPORTS_PER_DAY, limit: FREE_IMPORTS_PER_DAY, used };
}