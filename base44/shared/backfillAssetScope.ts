// Service-role queries are not an authorization boundary. Verify both IDs
// again before parsing any URL returned by the storage provider.
export function eligibleBackfillAssets(assets, athleteId, sessionId) {
  if (!Array.isArray(assets) || !athleteId || !sessionId) return [];
  return assets.filter((asset) => asset?.athlete_id === athleteId &&
    asset?.session_id === sessionId && typeof asset?.file_url === 'string' &&
    asset.file_url.length > 0);
}
