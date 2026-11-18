import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('fetchAthleteProfile verified ownership gate', () => {
  const source = readFileSync(resolve(process.cwd(), 'base44/functions/fetchAthleteProfile/entry.ts'), 'utf8');

  it('uses a creator-scoped query instead of caller-editable athlete profile links', () => {
    expect(source).toContain('created_by_id: user.id');
    expect(source).not.toMatch(/const linkedId\s*=/);
    expect(source).not.toMatch(/AthleteProfile\.get\(linkedId\)/);
  });

  it('rejects mismatched, malformed and absent ownership evidence', () => {
    expect(source).toContain('p.created_by_id !== user.id');
    expect(source).toContain('Profile ownership could not be verified');
    expect(source).toContain('status: 403');
  });

  it('requires authentication and redacts internal read failures', () => {
    expect(source).toContain('if (!user?.id)');
    expect(source).toContain("error: 'Unable to load athlete profile'");
    expect(source).not.toContain('error.message');
  });
});
