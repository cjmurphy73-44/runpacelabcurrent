import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

export async function runBackfill(base44: any, apply = false) {
  const { AthleteProfile, User } = base44.asServiceRole.entities;
  const owners = new Map<string, string[]>();
  const limit = 200;
  for (let skip = 0; ; skip += limit) {
    const rows = await AthleteProfile.filter({}, 'id', limit, skip, ['id', 'created_by_id']);
    for (const { id, created_by_id } of rows) {
      if (!created_by_id) continue;
      const profiles = owners.get(created_by_id) ?? [];
      profiles.push(id);
      owners.set(created_by_id, profiles);
    }
    if (rows.length < limit) break;
  }

  let profilesMapped = 0;
  let ambiguous = 0;
  let failed = 0;
  for (const [userId, ids] of owners) {
    try {
      const user = await User.get(userId);
      const verified = user?.data?.verified_athlete_profile_id ?? user?.verified_athlete_profile_id;
      const profileId = ids.length === 1 ? ids[0] : ids.includes(verified) ? verified : null;
      if (!profileId) { ambiguous++; continue; }
      if (apply && verified !== profileId) {
        await User.update(userId, { verified_athlete_profile_id: profileId, athlete_profile_id: profileId });
      }
      profilesMapped++;
    } catch {
      failed++;
    }
  }
  return { profiles_mapped: profilesMapped, ambiguous, failed };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json().catch(() => null);
    const apply = body?.apply === true;
    const result = await runBackfill(base44, apply);
    return Response.json({ success: result.failed === 0, dry_run: !apply, ...result });
  } catch {
    return Response.json({ error: 'Could not backfill verified profile links' }, { status: 500 });
  }
});
