# AUDIT-134 task 1.6: release source provenance, 2026-11-14

Read-only evidence captured from GitHub, Base44 and Vercel connectors. **No production mutation, merge, publish or deployment.**

## Connected environments
- GitHub: `cjmurphy73-44/runpacelabcurrent`, protected `main` according to repository README. Last identified production GitHub SHA: `c03498a6e27b23f66554247bc70f17741bc2b4fd`. Do not infer current GitHub HEAD from this deployment; re-read GitHub before release.
- Base44 staging: app `6aefe9d09e2788fc8591c758`, `get_app_status` ready, version `ba12d35f346189a65e6d6f94d1bb57d450b78e7f`. **Not proof of published frontend or source SHA.**
- Base44 production: app `6a504ebe6a5a6d1be058226c`, `get_app_status` ready, version `3f386d4d52042940cb1767e6950ec78e33b3c81e`. **Not proof of published frontend or source SHA.**
- Both Base44 app listings report `git_remote_source=s3`; this does not demonstrate GitHub main parity.
- Vercel project: `prj_huPppzjG7s6vOtrQkH00TSUggpok`, team `team_WKsmZBlWoNqHSHx6KDp7JgmE`, linked to the correct GitHub repo.
- Vercel production: resolving `trainpacelab.com` returned READY production deployment `dpl_1c1vaWzfDcbWk4TadsZDAeU3ub4y` with `githubCommitRef=main`, SHA `c03498a6e27b23f66554247bc70f17741bc2b4fd`, alias `www.trainpacelab.com`; apex redirects 308 to www.
- Vercel latest listed READY preview (target null): `dpl_75zA9vA6uu7BHnaNNskrRZAQF3uP`, branch `codex/audit-134-stripe-atomic-reservation-contract`, SHA `eed666898156b1d8c00a22d76be927c4e6f8922f`. **Not production.**
- GitHub PR #128 remains draft, head `16912e2f609e881a80bc13ea0261341b5125ba61`. No evidence it is in production.

## Findings and blockers
1. Vercel production's resolved SHA differs from both Base44 app versions. These values come from different products; they cannot be equated with deployed content until independently validated.
2. README documents Base44 direct-to-main two-way sync blocked by protected main, and stale checkpoint risk. Do not bypass protection.
3. Base44 status/version is not a published commit attestation. Confirm exact Builder checkpoint, backend deployment, environment isolation and public published source using supported Base44 controls before release.
4. GitHub main must be read at release time; successful PR checks and READY previews are insufficient.
5. Verify that the **actual domain alias** resolves to the intended Vercel deployment at the candidate SHA. Do not rely on newest preview.
6. Check staging acceptance, isolated accounts, backend function/schema compatibility, and a rollback plan before any production publish.

## Guard
`src/lib/releaseEvidenceGate.js` is a pure fail-closed policy requiring complete 40-character matching SHA evidence for protected GitHub main and CI, Vercel production domain deployment, verified Base44 production checkpoint/publication, and staging acceptance. It does not call any provider, deploy, or mutate data. Synthetic tests are in `src/lib/__tests__/releaseEvidenceGate.test.js`.

**Decision: HOLD.** This is an evidence inventory, not an authorization to deploy. Before release, verify Base44 source/publish attestation and exact GitHub main, resolve discrepancies, execute tests, and obtain explicit user approval.
