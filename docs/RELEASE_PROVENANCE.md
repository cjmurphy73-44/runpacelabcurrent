# REL-002 | TrainPaceLab release provenance gate

**Status:** proposed, draft-only. The verifier is an offline consistency guard, not a live deployment, backend isolation attestation, security test or proof that URLs are reachable.

## One canonical evidence record per proposed release

Create a JSON record outside production systems. Populate it from independently retrieved GitHub, Vercel, Base44 and smoke-test evidence; never copy a stale dashboard label or infer a production deployment from a READY preview. Keep authentication tokens, athlete information, customer data and provider secrets out of evidence.

```json
{
  "github": { "branch": "main", "sha": "<exact 40-char GitHub main SHA>" },
  "ci": {
    "sha": "<identical SHA>", "check": "validate",
    "status": "completed", "conclusion": "success", "integration_id": 15368,
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

Run `node scripts/verify-release-provenance.mjs path/to/release.json`. Exit 0 only on internally complete evidence; exit 1 for blocked or contradictory evidence, exit 2 for invalid input. This checks field consistency and a 24-hour smoke freshness limit, **not** the authenticity of the provided evidence. Release reviewers must independently open source links and confirm current branch, CI, deployment ID, production alias and backend revision before signing off. The included Vitest fixtures are synthetic. The local CLI entry point is also tested, but a structurally complete record never independently proves authenticity. This tool does **not** authorize merges or deployments; keep owner approval and release HOLD separate.

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

## Controlled production recovery and smoke acceptance proposal (requires separate approval for writes)

1. Capture a read-only preflight at decision time: current protected `main` commit, exact `validate` check run with app integration ID 15368, most recent Vercel production ID/source/alias, GitHub Vercel failure context, and Vercel Hobby quota eligibility. If the quota window is not available or the status is ambiguous, **STOP**. Do not silently trigger a deployment, buy a plan or use an unverified rollback.
2. Confirm Vercel Git linkage and `main` production target; no unapproved preview branch or Base44 builder publish. If quota has demonstrably cleared, request separate owner approval for **one** exact-SHA production recovery deployment, after reviewing whether provider action could run against a later commit. Avoid retries if source SHA or promotion target is uncertain.
3. After an approved action, fetch the resulting Vercel deployment ID directly and confirm `target=production`, `READY`, Git SHA equals the authorized main SHA, and `trainpacelab.com` is actually assigned to that deployment. A `READY` preview or a GitHub green CI check alone is insufficient. Do not republish stale Base44 checkpoints.
4. Perform non-destructive browser smoke on `https://trainpacelab.com`: public home renders, login entry loads without claiming auth worked, and 390px mobile navigation is accessible. Capture timestamp, observed path, browser/device, exact deployment identity and immutable evidence link separately for every check. Do not execute a real user login, billing, provider sync, or write athlete data without explicit authorization.
5. Coordinate Base44 source/checkpoint proof with support issue #24 and PR #194; coordinate isolated staging acceptance with PR #149. These are independent, blocking gates, not automatic consequences of Vercel recovery. If Base44 checkpoint SHA semantics do not map to GitHub commit identity, document the validated mapping rather than inventing equal SHAs; adjust the contract through review before a legitimate release can pass.
6. Re-run the offline evidence verifier and independently inspect all source references. Record PASS, FAIL or UNKNOWN per gate. Keep release HOLD until remaining authenticated, security, payments and science beta acceptance evidence is separately approved.

**Ownership:** Release Engineering owns this evidence chain; specialist PR owners supply function-level CI/runtime evidence. Do not edit other agents' branches or Odysseus to manufacture release evidence.
