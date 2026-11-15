import { describe, expect, it } from 'vitest';
import { historyLoadLabel } from '../historyLoadLabel.js';

describe('workout history load labels', () => {
  it('keeps TSS and TRIMP units distinct', () => {
    expect(historyLoadLabel({ session_tss: 64, load_source: 'summary' })).toEqual({ amount: '64 TSS', detail: 'Estimated from summary' });
    expect(historyLoadLabel({ session_trimp: 47.8, load_source: 'stream' })).toEqual({ amount: '48 TRIMP', detail: 'Recording-derived, verification pending' });
  });
  it('does not label a mixed-unit record as TRIMP', () => {
    expect(historyLoadLabel({ session_trimp: 35, session_tss: 50 }).amount).toBe('Load unavailable');
  });
  it('does not manufacture a zero from missing or invalid load', () => {
    for (const w of [{}, { session_trimp: 0 }, { session_tss: -2 }, { session_trimp: Infinity }, { session_tss: '50' }]) {
      expect(historyLoadLabel(w).amount).toBe('Load unavailable');
    }
  });
  it('does not claim stream verification based on a label alone', () => {
    expect(historyLoadLabel({ session_trimp: 20, load_source: 'stream' }).detail).toContain('verification pending');
  });
});
