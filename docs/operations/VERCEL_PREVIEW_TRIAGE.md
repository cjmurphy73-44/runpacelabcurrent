# OPS — Vercel preview failure and rate-limit triage

Updated 2026-11-13. This is a non-production operational procedure, not deployment acceptance evidence.

## Observed incident

- GitHub PR #68 head `793b974b6ca1037445c9b3f38fb8f5492369de7c` and PR #69 head `caa51204968e860ae15928238da001faafb49dcd` received a Vercel status of **failure**, description: **Deployment rate limited — retry in 24 hours**. This is a quota/rate gate, not evidence of source failure.
- An earlier preview of PR #68 at commit `f3364f850005332328dae869245ef0ff296d2c9d`, deployment `dpl_FZHJ4YdSbiFTNoQVipfgvhxjRnGG`, reported `ERROR` with `npm run build exited with 1`. Its underlying build log still needs examination. Do not attribute it to the later rate-limit failure.
- Other preview deployments in the same project have reached `READY`. Preview readiness does not verify the published Base44 app.

## Reproducible acceptance procedure

1. Record PR number, exact head SHA, Vercel deployment ID, environment, and UTC time. Never rely on a previous commit's green deployment.
2. Inspect GitHub Actions `validate` for that exact SHA; require typecheck, tests, build and source-map guard. If any fail, repair in a focused PR.
3. Inspect the Vercel **status description** and build logs for the exact deployment. Classify separately: quota/rate-limited, compile/build failure, environment/config failure, or deployment success.
4. For a quota-limited deployment, **wait for the provider's documented reset**; do not spam redeploys, bypass required checks, buy capacity, or merge on the strength of another SHA's preview.
5. Once capacity is available, request one fresh preview for the **current** PR head. Confirm `READY`, check that Preview Base44 app ID/base URL are explicitly staging-bound, and perform only non-destructive checks until staging isolation is verified.
6. Merge only if current-head GitHub CI and required Vercel checks are green, the branch is current with protected main, and review/branch rules permit it. Use expected-head SHA to prevent race merges.
7. After merge, record merge SHA separately from Vercel deployment ID and Base44 published checkpoint. Mark **production verified** only after matching Base44 source identity and authenticated smoke evidence; see REL-001/#24.

## Safety and escalation

- Do not change production environment variables, tokens, schemas, athlete records, billing state, or deployment aliases as a troubleshooting shortcut.
- If the build fails again after the rate limit resets, capture the actual build-log error and make the smallest independently tested correction.
- If Base44 source remains stale, leave production unverified even when GitHub and Vercel are green.
- Record blockers on the affected PR and select another independent roadmap task while waiting.
