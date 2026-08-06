import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Whitelist of athlete-profile fields that can be edited from Settings.
// Computed/system fields (current_ctl, current_atl, current_tsb, last_data_sync) are excluded.
const ALLOWED_FIELDS = [
  'first_name', 'last_name', 'country', 'height_cm', 'weight_kg', 'age', 'sex',
  'training_tier_preference', 'max_heart_rate', 'resting_hr', 'lactate_threshold_hr',
  'ftp_watts', 'functional_threshold_pace_ms', 'vdot_estimate',
  'ctl_time_constant_days', 'atl_time_constant_days', 'injury_history',
];

// Training-philosophy → EWMA time constants, kept in sync with ProfileSetupForm so editing the
// tier in Settings updates the CTL/ATL tau used by downstream load calculations.
const TIER_CONSTANTS = {
  conservative: { ctl: 10, atl: 12 },
  moderate: { ctl: 42, atl: 7 },
  aggressive: { ctl: 20, atl: 5 },
};

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { athlete_id, updates } = body;
    if (!athlete_id || typeof athlete_id !== 'string') {
      return Response.json({ error: 'athlete_id is required' }, { status: 400 });
    }
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      return Response.json({ error: 'updates object is required' }, { status: 400 });
    }

    let athlete;
    try {
      athlete = await base44.entities.AthleteProfile.get(athlete_id);
    } catch (_e) {
      return Response.json({ error: 'Athlete profile not found' }, { status: 404 });
    }
    // Ownership check — a user may only edit their own profile.
    if (athlete.created_by_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const cleanUpdates = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in updates) cleanUpdates[key] = updates[key];
    }

    // When the training tier changes, re-apply the matching CTL/ATL time constants unless the
    // caller explicitly overrode them in the same payload.
    if (cleanUpdates.training_tier_preference && TIER_CONSTANTS[cleanUpdates.training_tier_preference]) {
      const c = TIER_CONSTANTS[cleanUpdates.training_tier_preference];
      if (!('ctl_time_constant_days' in cleanUpdates)) cleanUpdates.ctl_time_constant_days = c.ctl;
      if (!('atl_time_constant_days' in cleanUpdates)) cleanUpdates.atl_time_constant_days = c.atl;
    }

    if (Object.keys(cleanUpdates).length === 0) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await base44.entities.AthleteProfile.update(athlete_id, cleanUpdates);
    return Response.json({ success: true, athlete: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}