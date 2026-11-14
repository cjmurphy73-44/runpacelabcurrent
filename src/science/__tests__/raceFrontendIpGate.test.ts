// Regression check for the browser science IP review gate. This test never
// changes the allowlist or permits new browser-side math imports.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const read = p => readFileSync(resolve(root, p), 'utf8');
describe('frontend science IP boundary review', () => {
  it('keeps the direct import gate active in the production build script', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.scripts.build).toContain('check-client-science-imports.mjs');
    const guard = read('scripts/check-client-science-imports.mjs');
    expect(guard).toContain('process.exitCode = 1');
    expect(guard).toContain('New frontend science imports require an IP review');
  });
  it('does not silently whitelist the two currently unreviewed browser imports', () => {
    const guard = read('scripts/check-client-science-imports.mjs');
    const allowed = guard.split('const allowed = new Set([')[1]?.split(']);')[0] || '';
    expect(allowed).not.toContain('components/NorwegianIntervalPlanner.tsx');
    expect(allowed).not.toContain('lib/physiologyEngine.ts');
  });
  it('preserves the flagged imports as an explicit pending review instead of masking them', () => {
    expect(read('src/components/NorwegianIntervalPlanner.tsx')).toContain('@/science/norwegianEngine');
    expect(read('src/lib/physiologyEngine.ts')).toContain('../science/vdot');
  });
});
