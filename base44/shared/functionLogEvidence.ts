/**
 * Read-only Base44 function-log evidence classification.
 * The API's env=prod is the published deployment of the requested app,
 * NOT a statement that the app is TrainPaceLab production.
 * Historical errors must not be represented as current deployment failures.
 */
export type FunctionLogLine = { time?: string; timestamp?: string; level?: string; message?: string };
export function summarizeFunctionLogEvidence(
  lines: readonly FunctionLogLine[],
  options: { appId: string; expectedAppId: string; env: 'preview' | 'prod'; since: string }
) {
  if (!/^[a-f0-9]{24}$/i.test(options.appId) || options.appId !== options.expectedAppId) {
    return { verified: false, reason: 'APP_ID_UNVERIFIED', matching: 0, stale: 0 };
  }
  const cutoff = Date.parse(options.since);
  if (!Number.isFinite(cutoff)) return { verified: false, reason: 'INVALID_CUTOFF', matching: 0, stale: 0 };
  let matching = 0;
  let stale = 0;
  for (const line of lines) {
    if (line.level !== 'error') continue;
    const time = Date.parse(line.time || line.timestamp || '');
    if (!Number.isFinite(time) || time < cutoff) { stale++; continue; }
    matching++;
  }
  return { verified: true, reason: matching ? 'RECENT_ERRORS' : 'NO_RECENT_ERRORS_OBSERVED', matching, stale };
}
