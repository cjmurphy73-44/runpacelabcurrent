# REL-002 | TrainPaceLab release provenance gate

**Status:** proposed, draft-only. The verifier is an offline consistency guard, not a live deployment, backend isolation attestation, security test or proof that URLs are reachable.

## One canonical evidence record per proposed release

Create a JSON record outside production systems. Populate it from independently retrieved GitHub, Vercel, Base44 and smoke-test evidence; never copy a stale dashboard label or infer a production deployment from a READY preview. Keep authentication tokens, athlete information, customer data and provider secrets out of evidence.

```json
{
  "github": { "branch": "main", "sha": "<exact 40-char GitHub main SHA>" },
  "ci": {
    "sha": "<identical SHA>", "check": "validate",
    "status": "completed", "conclusion": "success",
    "run_url": "https://github.com/cjmurphy73-44/runpacelabcurrent/actions/runs/<ID>"
  },
  "vercel": {
    "id": "<dpl_ deployment ID>", "sha": "<identical SHA>",
    "project_id": "prj_huPppzjG7s6vOtrQkH00TSUggpok",
    "target": "production", "state": "READY",
    "aliases": ["trainpacelab.com"]
  },
  "smoke": {
    "sha": "<identical SHA>", "deployment_id": "<same dpl_ ID>",
    "domain": "trainpacelab.com", "checked_at": "<ISO-8601 UTC timestamp>",
    "checks": [
      { "name": "public_home", "status": "pass", "evidence_url": "<HTTPS evidence URL>" },
      { "name": "login_entry", "status": "pass", "evidence_url": "<HTTPS evidence URL>" },
      { "name": "mobile_390", "status": "pass", "evidence_url": "<HTTPS evidence URL>" }
    ]
  },
  "base44": {
    "status": "verified", "source_sha": "<identical SHA>",
    "checkpoint_id": "<independently observed published checkpoint>",
    "isolation_verified": true
  }
}
```

Run `node scripts/verify-release-provenance.mjs path/to/release.json`. Exit 0 only on internally complete evidence; exit 1 for blocked or contradictory evidence, exit 2 for invalid input. This checks field consistency and a 24-hour smoke freshness limit, **not** the authenticity of the provided evidence. Release reviewers must independently open source links and confirm current branch, CI, deployment ID, production alias and backend revision before signing off. The included Vitest fixtures are synthetic.

## Acceptance and hard stops

1. A protected `main` commit with the exact required `validate` GitHub check successful on that commit. A PR-head green run does not substitute for main-commit evidence.
2. Vercel deployment ID from the TrainPaceLab project with `target=production`, `state=READY`, Git source SHA matching `main`, and observed alias `trainpacelab.com`. A preview with `target=null` must fail.
3. Fresh, independently recorded browser smoke for public home, login entry and 390 px mobile. This is a *minimum infrastructure smoke*; full authenticated workout, plans, coach safety, payments and cross-user isolation remain separate beta-release gates. Do not use real athlete data for smoke.
4. Source-consistent Base44 checkpoint and verified backend/environment isolation. Current Base44 two-way GitHub sync conflict (#24, PR #194) and staging isolation PR #149 remain blockers; if the Base44 revision cannot be proven, leave status unverified and stop.
5. Exact owner approval before merge, deploy or promotion. Do not infer approval from green CI.

## Live baseline, 15 November 2026 (audit, NOT evidence of release)

- GitHub main: `5a9532b59da0cddb34e223dff536ef1700ef66d4`, GitHub `validate` success.
- GitHub Vercel status: failure pointing to daily deployment-rate limit; no Vercel production deployment for that SHA.
- Most recent confirmed READY Vercel production source: `c03498a6e27b23f66554247bc70f17741bc2b4fd`, deployment `dpl_1c1vaWzfDcbWk4TadsZDAeU3ub4y`.
- Base44 protected-main sync/checkpoint mismatch remains unresolved; staging isolation unverified. This is **BLOCKED**, not `READY`.
- Vercel `git.deploymentEnabled` on main allows `main` and `release/**` and blocks routine branches that inherit the configuration. Older branches without the file may continue deploying previews.

## Operational recovery sequence (requires separate approval for writes)

1. Confirm current Vercel quota/recovery state from actual provider record; **do not** silently trigger deployment or buy a plan.
2. Confirm deployment automation recognizes protected `main`. If quota is still preventing it, obtain owner permission for one deliberate recovery attempt only after limits and preview noise are controlled.
3. Re-read GitHub main/validate and Vercel source/target/alias after any recovery. Never publish a stale Base44 checkpoint.
4. Capture smoke evidence with isolated synthetic accounts and independently verify Base44 source/isolation.
5. Only then consider the complete REL-002 gate. Keep release HOLD until all downstream beta gates are proved.

**Ownership:** Release Engineering owns this evidence chain; specialist PR owners supply function-level CI/runtime evidence. Do not edit other agents' branches or Odysseus to manufacture release evidence.
