// Pure selection gate for admin-only historical telemetry recovery.
// COROS summary sessions may have no raw_file_url even when the original FIT
// can still be fetched using the connected provider. Do not assume recovery.
export function isBackfillCandidate(session) {
  if (!session || typeof session !== 'object') return false;
  if (session.zone_method === 'average' || session.zone_method === 'laps') return true;
  if (Array.isArray(session.streams) && session.streams.length > 10) return false;
  if (session.raw_file_url) return true;
  // Only identifiable COROS activities: do not rescan unrelated/manual sessions.
  return session.source_provider === 'coros'
    && typeof session.provider_activity_id === 'string'
    && session.provider_activity_id.trim().length > 0;
}
