import { mcpToolCall } from './corosMcp.ts';
import { fitUrlsFromText } from './corosFitUrls.ts';
import { isCompleteCorosFit, MAX_COROS_FIT_BYTES } from './corosRecordingArchive.ts';
import { assertSafeFileUrl } from './urlGuard.ts';
import { parseFitWithLaps } from './workoutParsers.ts';
import { isUsableTelemetry } from './streamValidity.ts';

async function download(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000), redirect: 'error' });
  const reader = response.ok ? response.body?.getReader() : null;
  if (!reader) return null;
  const buffer = new Uint8Array(MAX_COROS_FIT_BYTES);
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return buffer.slice(0, length);
      if (length + value.byteLength > buffer.length) {
        await reader.cancel();
        return null;
      }
      buffer.set(value, length);
      length += value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }
}

// Keep the storage path independent of the deployed historical and webhook
// import handlers. A failed archive attempt cannot touch their saved workouts.
export async function retrieveOriginalCorosFit(token, labelId, sportType, duration, maxSamples) {
  const response = await mcpToolCall(token, 'queryActivityFitFileDownloadUrls', {
    labelId, sportType: Number(sportType),
  });
  const text = response?.content?.map(part => part.text || '').join('\n') || '';
  for (const url of fitUrlsFromText(text).slice(0, 3)) {
    if (!assertSafeFileUrl(url).ok) continue;
    const bytes = await download(url).catch(() => null);
    if (!bytes || !isCompleteCorosFit(bytes)) continue;
    const parsed = parseFitWithLaps(bytes);
    if (parsed && parsed.stream.length <= maxSamples && isUsableTelemetry(parsed.stream, duration)) return bytes;
  }
  return null;
}
