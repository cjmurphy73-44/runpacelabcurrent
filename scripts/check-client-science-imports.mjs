// Defense-in-depth: prevent new direct browser imports of mathematical modules.
// This is a baseline gate, NOT proof that existing or transitive imports are private.
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
const root = new URL('../src/', import.meta.url).pathname;
const allowed = new Set([
  'components/WeatherStressWidget.tsx',
  'components/dashboard/AutoReplanPreviewCard.tsx',
  'components/dashboard/OdeModelChart.jsx',
  'components/dashboard/ReadinessScoreCard.jsx',
  'components/dashboard/StrainReporter.tsx',
  'components/dashboard/OnboardingFlow.jsx',
  'components/onboarding/StepBaseline.jsx',
  'context/FitnessContext.jsx',
  'pages/RacePrediction.jsx',
  'services/WorkloadService.ts',
  'services/telemetry/GarminAdapter.ts',
  'utils/streamReconciler.ts',
]);
const violations = [];
const found = new Set();
async function walk(dir) {
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, ent.name);
    if (ent.isDirectory()) { if (ent.name !== 'science' && ent.name !== '__tests__') await walk(full); continue; }
    if (!/\.[jt]sx?$/.test(ent.name) || /\.test\.[jt]sx?$/.test(ent.name)) continue;
    const content = await readFile(full, 'utf8');
    const file = relative(root, full).replaceAll('\\', '/');
    // Includes static imports, dynamic imports and require(). Relative paths must
    // be resolved before checking whether they reach src/science.
    const specifiers = [...content.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|\bimport\s*)['"]([^'"]+)['"]/g)];
    for (const [, spec] of specifiers) {
      const isMath = spec.startsWith('@/science/') ||
        (spec.startsWith('.') && join(dir, spec).replaceAll('\\', '/').includes('/src/science/'));
      if (!isMath) continue;
      found.add(file);
      if (!allowed.has(file)) violations.push(file);
    }
  }
}
await walk(root);
if (violations.length) {
  console.error('New frontend science imports require an IP review:', [...new Set(violations)].join(', '));
  process.exitCode = 1;
} else {
  console.log('Frontend science import gate passed:', found.size, 'existing import sites tracked');
}
