import { describe, it, expect } from 'vitest';
import { HOME_STATES, selectHomeState, canRenderTrainingResponse } from '../homePresentationState.js';

describe('Home presentation state', () => {
  it('distinguishes empty, failed and unknown quality without inventing current state', () => {
    expect(selectHomeState().state).toBe(HOME_STATES.EMPTY);
    expect(selectHomeState({ hasTrainingHistory: true, loadFailed: true }).state).toBe(HOME_STATES.ERROR);
    expect(selectHomeState({ hasTrainingHistory: true }).state).toBe(HOME_STATES.PARTIAL);
  });
  it('requires explicit complete evidence before current', () => {
    expect(selectHomeState({ hasTrainingHistory: true, dataQuality: 'complete' }).state).toBe(HOME_STATES.CURRENT);
    expect(selectHomeState({ hasTrainingHistory: true, dataQuality: 'insufficient' }).state).toBe(HOME_STATES.PARTIAL);
  });
  it('uses an explicit freshness policy, not a guessed age threshold', () => {
    const input = { hasTrainingHistory: true, dataQuality: 'complete', lastSuccessfulAt: '2026-11-12T00:00:00Z', now: '2026-11-15T00:00:00Z' };
    expect(selectHomeState(input).state).toBe(HOME_STATES.CURRENT);
    expect(selectHomeState({ ...input, maxAgeMs: 86400000 }).state).toBe(HOME_STATES.STALE);
    expect(selectHomeState({ ...input, maxAgeMs: -1 }).state).toBe(HOME_STATES.CURRENT);
  });
  it('prioritizes a confirmed load failure over stale or partial evidence', () => {
    expect(selectHomeState({ hasTrainingHistory: true, loadFailed: true, dataQuality: 'partial', lastSuccessfulAt: '2026-11-12', now: '2026-11-15', maxAgeMs: 1 }).state).toBe(HOME_STATES.ERROR);
  });
});

describe('Training response series provenance', () => {
  const valid = { method: 'banister-v1', source: 'verified load history', updatedAt: '2026-11-15T00:00:00Z',
    points: [{ timestamp: '2026-11-13T00:00:00Z', value: 10 }, { timestamp: '2026-11-14T00:00:00Z', value: 12 }] };
  it('allows an explicit, finite, chronologically ordered series', () => {
    expect(canRenderTrainingResponse(valid)).toBe(true);
  });
  it('rejects missing evidence, fabricated placeholders and invalid points', () => {
    expect(canRenderTrainingResponse({ ...valid, method: null })).toBe(false);
    expect(canRenderTrainingResponse({ ...valid, points: [{ value: 2 }] })).toBe(false);
    expect(canRenderTrainingResponse({ ...valid, points: [...valid.points].reverse() })).toBe(false);
    expect(canRenderTrainingResponse({ ...valid, points: [{ ...valid.points[0], value: Infinity }, valid.points[1]] })).toBe(false);
    expect(canRenderTrainingResponse({ ...valid, points: [valid.points[0], valid.points[0]] })).toBe(false);
  });
});
