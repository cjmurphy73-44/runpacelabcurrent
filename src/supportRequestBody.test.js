import { describe, expect, it } from 'vitest';
import { MAX_SUPPORT_BODY_BYTES, SupportBodyError, readSupportJson } from '../base44/shared/supportRequestBody.ts';

const request = (body, headers = {}) => new Request('https://example.invalid/support', { method: 'POST', body, headers });
const rejectStatus = async (req, status) => {
  await expect(readSupportJson(req)).rejects.toMatchObject({ status });
};

describe('anonymous support request byte ceiling', () => {
  it('accepts a valid small JSON object', async () => {
    await expect(readSupportJson(request(JSON.stringify({ message: 'test' })))).resolves.toEqual({ message: 'test' });
  });
  it('rejects over-limit Content-Length before consuming body', async () => {
    await rejectStatus(request('{}', { 'content-length': String(MAX_SUPPORT_BODY_BYTES + 1) }), 413);
  });
  it('rejects actual oversized bytes even when declared length is smaller', async () => {
    await rejectStatus(request(JSON.stringify({ message: 'x'.repeat(MAX_SUPPORT_BODY_BYTES) })), 413);
  });
  it('counts multibyte UTF-8 bytes rather than characters', async () => {
    await rejectStatus(request(JSON.stringify({ message: 'é'.repeat(MAX_SUPPORT_BODY_BYTES / 2) })), 413);
  });
  it('rejects chunked streams without Content-Length', async () => {
    const bytes = new TextEncoder().encode('x'.repeat(MAX_SUPPORT_BODY_BYTES + 1));
    const body = new ReadableStream({ start(controller) {
      controller.enqueue(bytes.subarray(0, 100));
      controller.enqueue(bytes.subarray(100));
      controller.close();
    } });
    await rejectStatus(new Request('https://example.invalid/support', { method: 'POST', body, duplex: 'half' }), 413);
  });
  it('rejects invalid JSON, arrays, empty and malformed UTF-8', async () => {
    await rejectStatus(request('{oops'), 400);
    await rejectStatus(request('[]'), 400);
    await rejectStatus(request(''), 400);
    await rejectStatus(request(new Uint8Array([0xff])), 400);
  });
  it('exposes only fixed public errors', () => {
    expect(new SupportBodyError(413).message).toBe('Request body too large');
    expect(new SupportBodyError(400).message).toBe('Invalid request body');
  });
});
