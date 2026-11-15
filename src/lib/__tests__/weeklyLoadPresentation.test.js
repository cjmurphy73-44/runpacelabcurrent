import { describe, it, expect } from 'vitest';
import { weeklyLoadPresentation } from '../weeklyLoadPresentation';
describe('weekly load display contract', () => {
  const verified = { date: '2026-11-12', load_metric: 'trimp', load_contract_verified: true, total_trimp: 40, verified_trimp: 30, summary_trimp: 10 };
  it('does not claim TRIMP units from the legacy field name alone', () => {
    expect(weeklyLoadPresentation([{ date: '2026-11-12', total_trimp: 40 }]).status).toBe('unverified');
  });
  it('accepts explicit verified unit contract and split', () => {
    expect(weeklyLoadPresentation([verified])).toMatchObject({ status: 'verified', points: [verified] });
  });
  it('rejects mismatched split, mixed units, invalid and missing values', () => {
    for (const row of [{ ...verified, summary_trimp: 11 }, { ...verified, load_metric: 'tss' }, { ...verified, total_trimp: NaN }, { ...verified, verified_trimp: undefined }]) {
      expect(weeklyLoadPresentation([row]).status).toBe('unverified');
    }
  });
  it('rejects partially verified windows instead of omitting problematic days', () => {
    expect(weeklyLoadPresentation([verified, { date: '2026-11-13', total_trimp: 10 }]).points).toEqual([]);
  });
  it('shows unavailable rather than a zero-load chart for no data', () => {
    expect(weeklyLoadPresentation([]).status).toBe('unavailable');
  });
});
