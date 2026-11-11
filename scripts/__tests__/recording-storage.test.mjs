// Resource-limit contract only: these are application budgets, not hosted limits.
import { describe, expect, it, vi } from 'vitest';
import { Buffer } from 'node:buffer';
import {
  MAX_FIT_INPUT_BYTES, MAX_INLINE_WORKOUT_BYTES,
  readBoundedRecording, assertInlineWorkoutFits,
} from '../../base44/shared/recordingStorage.ts';

describe('complete recording resource budgets', () => {
  it('accepts an exact input budget across chunks without changing bytes', async () => {
    const first = new Uint8Array(MAX_FIT_INPUT_BYTES - 1).fill(7);
    const response = new Response(new ReadableStream({ start(controller) {
      controller.enqueue(first);
      controller.enqueue(new Uint8Array([42]));
      controller.close();
    } }));
    const bytes = await readBoundedRecording(response);
    expect(bytes.byteLength).toBe(MAX_FIT_INPUT_BYTES);
    expect(Buffer.from(bytes.subarray(0, -1)).equals(Buffer.from(first))).toBe(true);
    expect(bytes.at(-1)).toBe(42);
    expect(response.body.locked).toBe(false);
  });

  it('cancels immediately when a declared length exceeds the budget', async () => {
    const cancel = vi.fn();
    const response = new Response(new ReadableStream({ cancel }), {
      headers: { 'content-length': String(MAX_FIT_INPUT_BYTES + 1) },
    });
    await expect(readBoundedRecording(response)).rejects.toMatchObject({ code: 'recording_input_too_large', status: 413 });
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('uses actual bytes despite an understated header and cancels before reading more', async () => {
    const cancel = vi.fn();
    let pulls = 0;
    const response = new Response(new ReadableStream({
      pull(controller) {
        pulls++;
        controller.enqueue(new Uint8Array(pulls === 1 ? MAX_FIT_INPUT_BYTES : 1));
      }, cancel,
    }, { highWaterMark: 0 }), { headers: { 'content-length': '1' } });
    await expect(readBoundedRecording(response)).rejects.toMatchObject({ code: 'recording_input_too_large' });
    expect(pulls).toBe(2);
    expect(cancel).toHaveBeenCalledOnce();
    expect(response.body.locked).toBe(false);
  });

  it('releases the stream reader after an interrupted download', async () => {
    const response = new Response(new ReadableStream({ pull(controller) {
      controller.error(new Error('synthetic transport interruption'));
    } }));
    await expect(readBoundedRecording(response)).rejects.toThrow('synthetic transport interruption');
    expect(response.body.locked).toBe(false);
  });

  it('accepts exactly the serialized byte budget and rejects one extra byte', () => {
    // JSON quotes consume two bytes too.
    expect(assertInlineWorkoutFits('a'.repeat(MAX_INLINE_WORKOUT_BYTES - 2))).toBe(MAX_INLINE_WORKOUT_BYTES);
    expect(() => assertInlineWorkoutFits('a'.repeat(MAX_INLINE_WORKOUT_BYTES - 1)))
      .toThrow('Detailed recording exceeds the inline storage limit');
  });

  it('counts UTF-8 bytes rather than JavaScript string length', () => {
    const payload = 'é'.repeat(MAX_INLINE_WORKOUT_BYTES / 2);
    expect(JSON.stringify(payload).length).toBeLessThan(MAX_INLINE_WORKOUT_BYTES);
    expect(() => assertInlineWorkoutFits(payload)).toThrow('Detailed recording exceeds the inline storage limit');
  });
});
