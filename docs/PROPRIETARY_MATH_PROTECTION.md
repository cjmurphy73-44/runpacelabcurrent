# Proprietary mathematics — release protection workstream

**Classification:** Internal development guidance. Do not record secret coefficients, formula implementations, model parameters or credentials in this document, build logs, issue titles, marketing copy or AI prompts.

## Current verified exposure
- The frontend directly imports mathematical modules from `src/science`, including readiness and physiology visualizations. Imported client modules are bundled for browsers, even when source maps are disabled.
- The app currently builds with Vite. This patch explicitly disables source-map emission and adds a release artifact check. **This is a defense-in-depth measure, not secrecy for bundled code.**
- Existing source-control history, deployed JS and prior artifacts may already contain implementation details; no claim is made that they are confidential simply because the repository is private.

## Next gated work
1. Owner-classify each model as **published science**, **proprietary**, or **undetermined (treat confidential)** without copying sensitive formula content into the classification report.
2. Trace browser import graph and inspect deployed bundle exposure in an authorized environment; record affected module paths, not secret logic.
3. For proprietary models, design authenticated athlete-scoped server-side endpoints, validate inputs, enforce RLS and rate limits, and return minimal derived metrics. No LLM calls from the secret computation path.
4. Migrate clients incrementally behind a feature flag with golden-case parity, missing-data behavior, latency and error tests. Do not remove the existing frontend implementation until verified.
5. Audit GitHub access, published assets, historic releases, source maps, error telemetry, logs, prompts and secrets. Assess exposure and rotate any compromised secrets separately.
6. Verify public marketing language explains methods and limitations without disclosing proprietary implementation.

**Release gate:** `npm run build && node scripts/check-release-source-maps.mjs`. This check does not prove proprietary algorithms are absent from the bundle.
