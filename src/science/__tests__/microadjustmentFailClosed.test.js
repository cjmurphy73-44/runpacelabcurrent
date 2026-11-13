import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Contract test for the deployed Base44 function source. It must not quietly
// reintroduce plan writes or AI-authored physiological prescriptions.
const source = readFileSync(
  new URL('../../../base44/functions/requestMicroadjustment/entry.ts', import.meta.url),
  'utf8',
);

describe('micro-adjustment endpoint fail-closed contract', () => {
  it('requires authentication and entitlement before responding', () => {
    expect(source).toContain('base44.auth.me()');
    expect(source).toContain('assertPaidPlan(base44, user)');
  });

  it('returns an explicit non-success response for unavailable adaptation', () => {
    expect(source).toContain('ADAPTATION_REQUIRES_VERIFIED_HISTORY');
    expect(source).toContain('status: 409');
    expect(source).toContain('adjusted: []');
  });

  it('cannot persist AI-proposed session changes or coach messages', () => {
    expect(source).not.toMatch(/InvokeLLM|bulkUpdate|TrainingPlanSession\\.update|CoachMessage\\.create/);
  });
});
