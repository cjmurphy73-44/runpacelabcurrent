# Cross-functional release readiness and dependency review — 9 November 2026

**Scope:** One atomic planning/evidence-reconciliation task. Source-only, no runtime code, staging/production access, credential access, merge, deployment, or Odysseus modification. This is a companion to, **not a replacement for**, `docs/MVP_ATOMIC_BACKLOG.md`, `docs/DEVELOPMENT_ROADMAP.md`, and `docs/MVP_RELEASE_CRITERIA.md`.

## Live GitHub reconciliation

PR heads checked on 9 November 2026. All six PRs were open; #5 was non-draft and the others were draft. Open/green does **not** mean independently reviewed, merged, or accepted.

| PR | Owner/workstream | Observed head | Status at review |
| --- | --- | --- | --- |
| #5 | CI restoration | `ef1a1328841ddce47e91e04f818888ceaca3a647` | Open, non-draft, unmerged |
| #4 | Staging isolation | `756debedfd46a8e6c47825f0cd692d4e078042fc` | Open, draft, unmerged |
| #6 | Team/backlog/research | `c53d3b45a73846c8ddca332ec50618418c6e6eed` | Open, draft, unmerged |
| #7 | Coaching hold/review | `ad7d0a9d4e57885ede3d20f424e7f59a2ed853ed` | Open, draft, unmerged |
| #8 | Workout export recovery | `cf46f922e6adf7a332202cebad80c389e09945bd` | Open, draft, unmerged |
| #9 | Provider connection feedback | `a6f5a155c751267fec1125d10cea23d6ccfe01ba` | Open, draft, unmerged |

The prior research commit `0a2a8c5957eaaad3995da3570f30abe84d3a311d` had successful PR-triggered workflow run `42560426807`; do not transfer that result to later heads. No reviewer approval, deployment state or real-provider evidence was verified in this review.

## Critical path and ownership

| Gate / workstream | Existing backlog owner | Evidence needed before acceptance | Next bounded action |
| --- | --- | --- | --- |
| G0 CI + staging | #5/#4, G0 tasks | Exact candidate SHA/checks, independent reviews, verified private staging target/source, fail-closed isolation, synthetic FIT-to-dashboard, rollback | Obtain supported metadata-only isolation read path for TPL-G0-002; do not retry the unchanged blank Data page |
| Odysseus | TPL-ODY-002 | Original-Mac independent repo, dirty/untracked/ignored content, history, backups and launcher paths verifiably preserved | Owner-assisted read-only preservation inventory; no gitlink-removal merge |
| G1 ownership/security | G1 backlog | Athlete/coach authorization, RLS, token isolation, cross-account negative tests, no raw GPS/health telemetry in logs | Prepare synthetic unauthorized-access fixture plan after G0 |
| G2 billing | G2 backlog | Stripe test subscriptions, webhook idempotency, entitlement enforcement and cancel/retry consistency | Inventory sandbox cases, no production payment or secret changes |
| G3 ingestion | G3 + Garmin/COROS | Independent provider auth/sync/re-sync/duplicate/partial-file evidence, missing-stream provenance, timezone handling | Define provider-specific synthetic acceptance matrices; no assertion of live OAuth health |
| G4 science/coach | G4 + research PR #6 | Reference stress formulas, typed stress units, deterministic backend single source, uncertainty/fallback, external science review | Research-only model-selection rubric; no athlete-facing personalized model |
| G5 deletion | G5 backlog | Complete athlete-scoped delete incl. future model state/forecasts, idempotent recovery and retention disclosures | Map derived-data deletion contracts before implementation |
| Athlete UX | UX-001..011 | First meaningful onboarding, missing-data action, manual draft persistence, narrow/iPad keyboard/focus, accessible feedback | One accepted synthetic-athlete journey after staging acceptance |
| Brand / imagery | ASSET-001..008 | Original logo and wordmark, favicon/PWA assets, lawful image provenance, clearly synthetic charts, responsive and accessibility evidence | Reconcile existing 15-record inventory; select one actual surface when G0 clears |
| QA, ops, release | QA/OPS/REL | Exact-head CI, sanitized evidence manifest, recovery tests, independent provider passes, approved beta and rollback | Keep a gate-by-gate evidence packet, not a generic green-build claim |
| Base44 independence | Later roadmap milestone | Complete backend dependency mapping, secure alternate-backend proof, migration/rollback | Discovery only; no rewrite or migration |

## Product architecture alignment

Use a single versioned data flow: provider/recording input → authorized normalized activity → stress record with method and units → deterministic workload service → optional independently validated performance model → coach decision record → responsive athlete UI. Security, deletion, billing entitlements, observability and provenance apply across every boundary. The optional model is **not** a prerequisite for a reliable MVP. The LLM explains validated backend outputs and must not invent numerical training load, race prediction, or injury risk.

### Quality gates that span teams

- **No misleading completeness:** sync succeeded, stream missing, partial summary, processing, and import failure are separate states.
- **No hidden unit mixing:** TRIMP and threshold-normalized stress are separate until explicit calibration; history coverage and initial conditions visible.
- **No false evidence:** synthetic screenshots and synthetic performance experiments labeled; never present as real athlete results.
- **No security regression:** athlete ownership checked at read, write, export and derived-model boundaries; no token or raw health-data leak.
- **No billing mismatch:** UI entitlement claims must match tested backend enforcement and deletion behavior.
- **No accessibility regression:** mobile/iPad layouts, keyboard, focus, contrast, reduced motion, image semantics and failure recovery checked.
- **No automatic release:** source commits and CI cannot substitute for required independent review and approved staging/provider acceptance.

## Decision log and handoff

1. Keep the existing canonical backlog and PR ownership; this report introduces **no new competing implementation task IDs**.
2. Treat **TPL-G0-002** as the top blocked acceptance item, requiring a supported metadata-only provider isolation path. No permission to inspect secrets or private health records.
3. Keep Odysseus removal blocked until the original Mac's independent project preservation is verified. A saved gitlink SHA is insufficient.
4. Continue mathematics as **research-only**: the latest synthetic misspecification experiment suggests model complexity should be selected using held-out evidence, not novelty.
5. Continue product visual/brand work through the pre-existing ASSET-001..008 sequence when its gates permit; retain provenance and editable sources.
6. Next atomic **engineering** action: resolve G0-002's metadata-only read capability or obtain an authorized equivalent, then record sanitized evidence and reassess G0. Next atomic **research** action: pre-register a model-selection rubric including realistic missingness and uncertainty calibration.

**Evidence limits:** This report is based on GitHub metadata and repository docs, not the user's Mac, live Base44 data, provider accounts, real staging athlete runs or independent reviewers. It does not certify any gate.
