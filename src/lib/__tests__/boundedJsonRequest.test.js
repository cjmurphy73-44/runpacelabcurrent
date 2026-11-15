import { describe, expect, it } from 'vitest';
import { readBoundedJsonRequest } from '../../../base44/shared/boundedJsonRequest.js';

const request = (body, headers) =>
  new Request('https://example.invalid/feedback', {
    method: 'POST',
    headers,
    body,
  });

describe('anonymous feedback bounded JSON reader', () => {
  it('accepts a normal JSON payload with no declared length', async () => {
    const result = await readBoundedJsonRequest(request('{"message":"hello"}'), 100);
    expect(result).toEqual({ ok: true, data: { message: 'hello' } });
  });

  it('rejects a body larger than limit even when Content-Length is absent', async () => {
    const result = await readBoundedJsonRequest(request('{"message":"' + 'x'.repeat(100) + '"}'), 40);
    expect(result).toMatchObject({ ok: false, status: 413 });
  });

  it('rejects a forged low Content-Length when the streamed body is oversized', async () => {
    const result = await readBoundedJsonRequest(
      request('{"message":"' + 'x'.repeat(100) + '"}', { 'content-length': '1' }), 40,
    );
    expect(result).toMatchObject({ ok: false, status: 413 });
  });

  it('rejects a declared oversize body before reading', async () => {
    const result = await readBoundedJsonRequest(
      request('{"message":"hello"}', { 'content-length': '9999999' }), 40,
    );
    expect(result).toMatchObject({ ok: false, status: 413 });
  });

  it('rejects malformed JSON and an absent body', async () => {
    expect(await readBoundedJsonRequest(request('{"message":'), 100))
      .toMatchObject({ ok: false, status: 400 });
    expect(await readBoundedJsonRequest({ headers: new Headers(), body: null }, 100))
      .toMatchObject({ ok: false, status: 400 });
  });

  it('enforces a byte limit rather than the number of Unicode characters', async () => {
    const payload = JSON.stringify({ message: 'é'.repeat(30) });
    expect(await readBoundedJsonRequest(request(payload), 45))
      .toMatchObject({ ok: false, status: 413 });
  });
});
