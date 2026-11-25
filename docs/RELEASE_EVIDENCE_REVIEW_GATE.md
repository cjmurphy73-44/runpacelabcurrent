# REL-005: offline release evidence completeness gate

This gate evaluates a **reviewer's supplied evidence manifest**, not the underlying truth of GitHub, Vercel, Base44, payment, or provider claims. Passing means **ready for human review only**. It does not remove release HOLD, authorize a merge/deploy, or replace authoritative read-only verification.

Implementation: `src/lib/releaseEvidenceGate.js`; synthetic tests: `src/lib/__tests__/releaseEvidenceGate.test.js`. The function accepts an object with a full 40-character `gitSha`, `releaseHold: true`, and `gates` keyed by `REQUIRED_GATES`. Each gate must have `status: "pass"`, an exact matching `gitSha`, a `verifiedAt` UTC timestamp and a scoped owned-repository GitHub run/commit/PR URL or Vercel dashboard deployment-record URL. All nine gates must be present. Missing, unknown, malformed or stale-head records return blockers.

**Evidence links are not fetched or authenticated by this function.** A fabricated URL within an allowed path or a self-attested pass could still satisfy its shape checks; arbitrary repositories, preview-site links, URL credentials and query parameters are rejected. The release reviewer must open each link, verify the actual source and scope, ensure Base44 published assets map to the exact commit, and independently confirm required CI and isolation. Never submit tokens, personal athlete data, private financial records, or production credentials in a manifest.

The checklist deliberately retains HOLD even for a complete manifest. A separate, explicit owner authorization is required for merging and deployment, followed by separately recorded published-source and live verification.

To run synthetic checks in an isolated checkout: `npm test -- src/lib/__tests__/releaseEvidenceGate.test.js`. No live services or secrets are needed. Exact-head CI and isolated browser checks must be reported independently; test files alone do not prove a pass.

This PR is scoped to release evidence evaluation. It does not modify the ongoing Home PR #277–#279, billing, device ingestion, Odysseus, or production state.
