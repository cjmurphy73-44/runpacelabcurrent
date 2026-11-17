import { describe, expect, it } from 'vitest';
import { classifyWorkoutUploadReceipt as classify } from '../workoutUploadReceipt';

describe('workout upload persistence receipt', () => {
  it('accepts confirmed new session', () => {
    expect(classify({ data: { success: true, attached: false, workout_session: { id: 'session-1' } } }).kind).toBe('success');
  });
  it('accepts confirmed attachment to an existing session', () => {
    expect(classify({ data: { success: true, attached: true, workout_session_id: 'session-2' } }).kind).toBe('success');
  });
  it('accepts positive summary CSV import counts', () => {
    expect(classify({ data: { success: true, imported_sessions_count: 2 } }).kind).toBe('success');
  });
  it('distinguishes all-duplicate imports from new saved sessions', () => {
    expect(classify({ data: { success: true, imported_sessions_count: 0, skipped_duplicates: 2 } }).kind).toBe('duplicate');
  });
  it.each([null, {}, { data: null }, { data: { success: true } }, { data: { success: false, workout_session: { id: 'x' } } }, { data: { success: true, attached: true } }, { data: { success: true, imported_sessions_count: 0 } }, { data: { success: true, imported_sessions_count: -1 } }])('fails closed on unconfirmed receipts %#', (response) => {
    expect(classify(response).kind).toBe('unconfirmed');
  });
  it('does not reflect raw backend error text into the UI', () => {
    const result = classify({ data: { error: 'private user token 123', success: true, workout_session: { id: 'x' } } });
    expect(result.kind).toBe('error');
    expect(result.message).not.toContain('private user token');
  });
});
