// base44/functions/auditLinkageMapping/entry.ts
// Read-only linkage audit that auto-re-links clear 1:1 cases the backfill missed and
// flags genuinely ambiguous ones for manual review. Runs AFTER backfillOwnershipMapping.
//
// For each User:
//   - ownedProfiles = AthleteProfile.filter({ created_by_id: user.id })
//   - exactly 1 owned + (athlete_profile_id missing or mismatched) → AUTO-RE-LINK
//   - multiple owned + no linkage → FLAG (ambiguous: which profile?)
//   - zero owned + athlete_profile_id set pointing at a profile they did not create → FLAG (mis-attribution)
//   - athlete_profile_id pointing at a nonexistent profile → FLAG (dangling)
//
// Admin-only (RLS-gated). Runs under asServiceRole to read across all users/profiles.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

export async function runAudit(base44) {
  const allUsers = await base44.asServiceRole.entities.User.filter({});
  const allProfiles = await base44.asServiceRole.entities.AthleteProfile.filter({});

  // Index profiles by created_by_id for owned-profile counting.
  const profilesByOwner = {};
  for (const p of allProfiles) {
    if (!p.created_by_id) continue;
    (profilesByOwner[p.created_by_id] ||= []).push(p);
  }
  // Index profiles by id for dangling-reference detection.
  const profileById = {};
  for (const p of allProfiles) profileById[p.id] = p;

  let autoRelinked = 0;
  const flagged = [];

  for (const user of allUsers) {
    const owned = profilesByOwner[user.id] || [];
    const linkedId = user.data?.athlete_profile_id || user.athlete_profile_id || null;

    if (owned.length === 1) {
      // Clear 1:1 — auto-re-link if missing or mismatched.
      const soleId = owned[0].id;
      if (linkedId !== soleId) {
        try {
          await base44.asServiceRole.entities.User.update(user.id, { athlete_profile_id: soleId });
          autoRelinked++;
        } catch (e) {
          flagged.push({ user_id: user.id, reason: `auto-re-link failed: ${e.message}`, owned_count: 1, linked_id: linkedId });
        }
      }
      continue;
    }

    if (owned.length > 1 && !linkedId) {
      // (a) multiple owned, no linkage — ambiguous.
      flagged.push({ user_id: user.id, reason: 'multiple owned profiles, no linkage (ambiguous)', owned_count: owned.length, owned_ids: owned.map((p) => p.id), linked_id: null });
      continue;
    }

    if (linkedId) {
      const target = profileById[linkedId];
      if (!target) {
        // (c) dangling — athlete_profile_id points at a nonexistent profile.
        flagged.push({ user_id: user.id, reason: 'dangling athlete_profile_id (profile not found)', owned_count: owned.length, linked_id: linkedId });
      } else if (target.created_by_id !== user.id && owned.length === 0) {
        // (b) zero owned + linked to a profile they did not create — mis-attribution.
        flagged.push({ user_id: user.id, reason: 'athlete_profile_id points at a profile this user did not create', owned_count: 0, linked_id: linkedId, profile_owner: target.created_by_id });
      }
    }
    // owned.length === 0 + no linkedId → clean (no data, no problem).
    // owned.length > 1 + linkedId valid & owned → already resolved, leave as-is.
  }

  return {
    users_audited: allUsers.length,
    auto_relinked: autoRelinked,
    flagged_count: flagged.length,
    flagged,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const result = await runAudit(base44);
    return Response.json({ success: true, ...result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});