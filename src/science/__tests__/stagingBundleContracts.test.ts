import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = (name: string) => readFileSync(resolve(process.cwd(), 'base44/functions', name, 'entry.ts'), 'utf8');

describe('Science 1.7: staging Deno function bundle contracts', () => {
  for (const name of ['acceptInvite', 'inviteAthlete']) {
    it(name + ' cannot simulate invitation success or write an assignment', () => {
      const text = source(name);
      expect(text).toContain('Deno.serve(');
      expect(text).toContain('COACH_INVITE_NOT_IMPLEMENTED');
      expect(text).toContain('status: 503');
      expect(text).not.toContain('simulated_invite_record');
      expect(text).not.toContain('from fastapi');
      expect(text).not.toMatch(/\.create\s*\(/);
    });
  }
  it('legacy calculation endpoints do not import unsupported @base44/cloud', () => {
    for (const name of ['calculateBanisterModel', 'calculateTrainingLoad']) {
      expect(source(name)).not.toContain('from "@base44/cloud"');
      expect(source(name)).toContain('Deno.serve(');
      expect(source(name)).toContain('LEGACY_CALCULATION_NOT_VALIDATED');
    }
  });
  it('VDOT endpoint uses a supported SDK and checks authentication', () => {
    const text = source('calculateVDOT');
    expect(text).toContain("npm:@base44/sdk@0.8.31");
    expect(text).toContain('Deno.serve(');
    expect(text).toContain('base44.auth.me()');
    expect(text).toContain('status: 401');
    expect(text).not.toContain('npm:@base44/runtime');
  });
  it('rest review is read-only and refuses concurrent rest confirmation', () => {
    const text = source('reviewRestDays');
    expect(text).toContain('ATOMIC_REST_CONFIRMATION_UNAVAILABLE');
    expect(text).not.toMatch(/DailyMetrics\.(?:create|update|bulkUpdate)\s*\(/);
  });
});
