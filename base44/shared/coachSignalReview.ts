// Append-only, per-source acknowledgements. No training prescription is changed.
async function fingerprint(message: any): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify([
    message.id, message.created_date, message.updated_date, message.content_text,
  ]));
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
    .map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function coachSignalReview(base44: any, user: any, body: any): Promise<Response> {
  if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!body || !['read', 'resolve'].includes(body.action) || typeof body.athlete_id !== 'string' || !body.athlete_id) {
    return Response.json({ error: 'Valid action and athlete_id required' }, { status: 400 });
  }
  // Do not trust the legacy client-writable linked profile or coach cache.
  const athlete = await base44.entities.AthleteProfile.get(body.athlete_id).catch(() => null);
  if (!athlete || athlete.created_by_id !== user.id) {
    return Response.json({ error: 'Profile owner required' }, { status: 403 });
  }
  const entities = base44.asServiceRole.entities;
  const messages = await entities.CoachMessage.filter({ athlete_id: athlete.id }, '-updated_date', 30);
  const keys = await Promise.all(messages.map(fingerprint));
  const revision = await fingerprint({ content_text: JSON.stringify(keys) });
  const existing = keys.length ? await entities.CoachSignalReview.filter({
    athlete_id: athlete.id, owner_user_id: user.id, source_key: { $in: keys },
  }, '-created_date', 500) : [];
  if (existing.length >= 500) return Response.json({ error: 'Review history could not be fully checked. Please retry later.' }, { status: 503 });
  const reviewed = new Set(existing.map((entry: any) => entry.source_key));
  if (body.action === 'resolve') {
    if (body.revision !== revision) return Response.json({ error: 'Conversation changed. Review the latest messages first.' }, { status: 409 });
    const selected = body.source_keys;
    if (!Array.isArray(selected) || !selected.length || selected.length > 30 || !selected.every(key => typeof key === 'string' && keys.includes(key))) {
      return Response.json({ error: 'Select the displayed guidance to review' }, { status: 400 });
    }
    const pending = [...new Set<string>(selected)].filter(key => !reviewed.has(key));
    if (pending.length) await entities.CoachSignalReview.bulkCreate(pending.map(source_key => ({
      athlete_id: athlete.id, owner_user_id: user.id, source_key,
      resolution: 'not_current', reviewed_at: new Date().toISOString(),
    })));
    // Duplicate requests are harmless. A later new/edited source has a different
    // key and is never acknowledged by an older request, even during a race.
    return Response.json({ success: true });
  }
  return Response.json({ revision, messages: messages.map((message: any, i: number) => ({ ...message, review_key: keys[i] })).filter((_m: any, i: number) => !reviewed.has(keys[i])) });
}
