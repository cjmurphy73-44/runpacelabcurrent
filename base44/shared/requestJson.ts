// Bound allocation even when the client sends chunked transfer encoding.
export async function readLimitedJson(req: Request, maxBytes = 16_384) {
  if (Number(req.headers.get('content-length')) > maxBytes || !req.body) return null;
  const reader = req.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let text = '';
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) return JSON.parse(text + decoder.decode());
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(value, { stream: true });
    }
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}
