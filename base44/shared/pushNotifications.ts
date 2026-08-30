// Fire-and-forget mobile push helper for native builds.
//
// Resolves an AthleteProfile (athlete_id) to the owning User (created_by_id) and
// sends a native push via the platform SendPushNotification integration. MUST be
// called from a backend function (server-side / asServiceRole).
//
// Never throws: pushes deliberately fail silently until the native mobile build is
// published AND APNs / Firebase Cloud Messaging credentials are configured in the
// Base44 dashboard (App settings → Native / Push). A push failure must never break
// the calling flow, so every error is swallowed and logged at warn level.

export interface PushPayload {
  title: string;
  content: string;
  action_label?: string;
  action_url?: string;
}

export async function sendAthletePush(
  base44: any,
  athleteId: string,
  opts: PushPayload
): Promise<void> {
  try {
    if (!athleteId || !opts?.title) return;
    const athlete = await base44.entities.AthleteProfile.get(athleteId).catch(() => null);
    const userId = athlete?.created_by_id;
    if (!userId) return;
    await base44.asServiceRole.integrations.Core.SendPushNotification({
      user_id: userId,
      title: opts.title,
      content: opts.content,
      action_label: opts.action_label,
      action_url: opts.action_url,
    });
  } catch (err: any) {
    console.warn('sendAthletePush failed (push credentials may not be configured):', err?.message || err);
  }
}