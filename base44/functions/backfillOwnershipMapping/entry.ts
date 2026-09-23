// base44/functions/backfillOwnershipMapping/entry.ts
// One-time backfill for S5 (health-data confidentiality). Sets athlete_profile_id on every
// User from their owned AthleteProfile.created_by_id, and populates coached_athletes from
// active CoachAthleteAssignment rows. Must run BEFORE the read RLS publishes, so existing
// users keep seeing their data the moment the RLS goes live.
//
// Admin-only (RLS-gated). Runs under asServiceRole to read across all users/profiles/assignments.
// Idempotent: safe to run repeatedly — it re-derives the same mapping each time.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

export async function runBackfill(base44) {
  // 1. Map every AthleteProfile to its owning user id → athlete_profile_id on that user.
  const allProfiles = await base44.asServiceRole.entities.AthleteProfile.filter({});
  let profileCount = 0;
  for (const profile of allProfiles) {
    if (!profile.created_by_id) continue;
    try {
      await base44.asServiceRole.entities.User.update(profile.created_by_id, { athlete_profile_id: profile.id });
      profileCount++;
    } catch (e) {
      console.warn(`backfill: could not set athlete_profile_id on user ${profile.created_by_id}:`, e.message);
    }
  }

  // 2. For every active CoachAthleteAssignment, add the athlete's profile id to the coach's
  //    coached_athletes array. Read the coach's current User record first so we append rather
  //    than overwrite, then write the merged (de-duplicated) array.
  const assignments = await base44.asServiceRole.entities.CoachAthleteAssignment.filter({ status: 'active' });
  const byCoach = {};
  for (const a of assignments) {
    if (!a.coach_user_id || !a.athlete_profile_id) continue;
    (byCoach[a.coach_user_id] ||= new Set()).add(a.athlete_profile_id);
  }
  let coachCount = 0;
  for (const [coachId, athleteSet] of Object.entries(byCoach)) {
    try {
      const coach = await base44.asServiceRole.entities.User.get(coachId).catch(() => null);
      const existing = Array.isArray(coach?.coached_athletes) ? coach.coached_athletes : [];
      const merged = [...new Set([...existing, ...athleteSet])];
      await base44.asServiceRole.entities.User.update(coachId, { coached_athletes: merged });
      coachCount++;
    } catch (e) {
      console.warn(`backfill: could not set coached_athletes on coach ${coachId}:`, e.message);
    }
  }

  return {
    profiles_mapped: profileCount,
    coaches_mapped: coachCount,
    total_assignments: assignments.length,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const result = await runBackfill(base44);
    return Response.json({ success: true, ...result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});