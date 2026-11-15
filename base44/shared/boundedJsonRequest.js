/** Read an anonymous JSON request without trusting Content-Length. */
export async function readBoundedJsonRequest(req, maxBytes = 16000) {
  const claimed = req.headers.get('content-length');
  if (claimed !== null && (!/^\d+$/.test(claimed) || Number(claimed) > maxBytes)) {
    return { ok: false, status: 413, error: 'Feedback submission too large' };
  }
  if (!req.body) return { ok: false, status: 400, error: 'Invalid feedback submission' };

  const reader = req.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return { ok: false, status: 413, error: 'Feedback submission too large' };
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    let data;
    try {
      data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    } catch {
      return { ok: false, status: 400, error: 'Invalid feedback submission' };
    }
    return { ok: true, data };
  } finally {
    reader.releaseLock();
  }
}
