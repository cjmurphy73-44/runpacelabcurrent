// Public support submissions must be bounded by actual bytes read, not only
// Content-Length (which can be missing or untrusted). Uses standard Request APIs.
export const MAX_SUPPORT_BODY_BYTES = 16 * 1024;

export class SupportBodyError extends Error {
  constructor(status: number) {
    super(status === 413 ? 'Request body too large' : 'Invalid request body');
    this.status = status;
  }
  status: number;
}

export async function readSupportJson(req: Request): Promise<Record<string, unknown>> {
  const length = req.headers.get('content-length');
  if (length !== null && /^\\d+$/.test(length) && Number(length) > MAX_SUPPORT_BODY_BYTES) {
    throw new SupportBodyError(413);
  }
  if (!req.body) throw new SupportBodyError(400);
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_SUPPORT_BODY_BYTES) throw new SupportBodyError(413);
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof SupportBodyError) throw error;
    throw new SupportBodyError(400);
  } finally {
    // Stop consuming on rejection; cancellation may reject for a broken stream.
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try {
    const parsed: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Not an object');
    return parsed as Record<string, unknown>;
  } catch { throw new SupportBodyError(400); }
}
