# TPL-G0-002: metadata-only isolation follow-up — 9 November 2026

Status: partial; the count-only access gap is resolved, full isolation is not.
Parent: 40c1043b50caabbcf358b5f9b0e651fdf4a2984a; owning existing PR #6.
This run continues the existing G0-002 evidence task, not telemetry implementation.
The earlier browser report is preserved unchanged. The current managed executor
has supported authenticated Base44 management API access through secure settings.
No production write, publish, provider invocation, secret-value read, record-list
read, credential/config change or Odysseus tracking change was performed.

## Executed reads and evidence

- App metadata: staging and production IDs match their private configured targets
  and differ. Staging is private; production is public. The production custom-domain
  list attaches trainpacelab.com and reports it not disabled. This is attachment
  metadata, not proof of current DNS/TLS or rendered site availability.
- Workflow list and individual reads: the exact same two staging IDs are inactive
  in both views; both production workflows are active in both views. Exact app,
  workflow, trigger and deployment IDs are retained privately. No CLI/dashboard
  disagreement is present in these fresh scoped reads. An old unscoped CLI report
  alone cannot identify which app it described.
- Secret names only: staging has TPL_ENVIRONMENT and WEBHOOK_SYNC_SECRET. No provider,
  Stripe or external-enable-flag name is listed. The names-only endpoint documents
  that values are never returned; masked placeholders were discarded. Production
  has Garmin/COROS and both test/live Stripe configuration names. No key mode,
  validity, callback registration or credential uniqueness is inferred.
- Supported GET entity-schemas identifies GarminConnection, CorosConnection,
  WearableConnection and StravaConnection. Each has a read rule scoped to
  created_by_id matching the authenticated user.
- Supported GET entities/{entity_name}/count returns count 0 for each of these
  four staging entities. No record fields, tokens, health data or user identifiers
  were fetched. The API explicitly limits counts by the caller's readable rows.
  Therefore these are credential-visible zeros, not app-wide empty-table proof.
- Supported GET backend-functions returned 47 staging and 45 production functions.
  All eight guarded staging entry files and their externalSyncGuard helper files
  exactly match infrastructure head 8bafa5178d40f0748800a18c6583253aebc241a4.
  Matching source does not prove an executed runtime outcome or full app isolation.
- Three changed frontend editor files (offlineSyncQueue, offlineSyncAdapters,
  loadForecasting) match staging candidate a2dd36020d573faa737695c5656ddc7034fa896f,
  not newer PR #9 head a6f5a155c751267fec1125d10cea23d6ccfe01ba. The staging site
  metadata records a dist deployment at 2026-11-09T01:10:03.826 UTC with no Git SHA.
  Its private artifact manifest supplies candidate provenance; editor-source parity
  alone does not establish served authenticated assets.
- Production site metadata records a git deployment at 2026-11-08T01:16:32.275 UTC,
  revision d1dafb84d46c281ba0c7bc3570184d7d57dd96eb. That commit exists locally and
  is an ancestor of main 3f386d4d52042940cb1767e6950ec78e33b3c81e. Garmin sync/webhook
  entry files match both revisions. COROS sync and telemetry-backfill entry files
  match newer main, not the recorded site revision. A single site SHA is not the
  backend deployment manifest. Only the named entry files were compared; this is
  not an assertion that every deployed dependency matches a complete Git tree.

## GitHub and research reconciliation

| PR | Current head | Target | Observed state / current CI |
| --- | --- | --- | --- |
| #4 | 756debedfd46a8e6c47825f0cd692d4e078042fc | fix/ci-restoration | Draft; checks page 504, current CI not attested here |
| #5 | ef1a1328841ddce47e91e04f818888ceaca3a647 | main | Open; six named jobs succeeded on this exact head |
| #6 | 40c1043b50caabbcf358b5f9b0e651fdf4a2984a | fix/ci-restoration | Draft; checks page 504, current CI not attested here |
| #7 | ad7d0a9d4e57885ede3d20f424e7f59a2ed853ed | fix/ci-restoration | Draft; checks page 504, current CI not attested here |
| #8 | cf46f922e6adf7a332202cebad80c389e09945bd | fix/coach-hold-review | Git head fetched; conversation/check reads failed, current state/review/CI not freshly attested |
| #9 | a6f5a155c751267fec1125d10cea23d6ccfe01ba | fix/workout-export-recovery | Draft; six named jobs succeeded on this exact head |

CI job names observed: Typecheck, Lint, Build, Backend, Tests, CI required.
Checks HTML contained individual This job succeeded labels at #5/#9 exact heads.
No approved review event was visible in the accessible overview pages. This is
not an authenticated review-list or effective branch-protection attestation.
Git refs and public HTML reads do not provide authenticated PR management.
No PR/branch was created, retargeted, merged, approved or rewritten.

Infrastructure is now published at 8bafa517; the old missing-commit blocker is
resolved. Existing REC-001 tests are not duplicated. PR #6 already contains source
research 6c019ff and Garmin route audit 40c1043; the asset inventory already exists.
PR #9 already includes exhausted-save recovery and TSB wording/characterization
follow-ups beyond the published staging candidate; do not implement them again.

Deployed Garmin webhook source retains the <=3600-sample storage condition in
both targets. COROS source includes its separate sample cap; neither is a real
provider-fidelity pass. Prioritize the proposed Garmin 3599/3600/3601 synthetic
characterization after its stated G0/review prerequisites, then a separate COROS
round-trip case. This run adds no telemetry test or runtime change across gates.

## Changed blocker and remaining limits

The supported count-only read route now works, replacing the blank-Data-UI access
blocker for credential-visible counts. Remaining G0-002 needs a supported app-wide
count/isolation attestation that accounts for owner RLS, plus private confirmation
of dedicated-test webhook-secret provenance and absence of copied production data.
Do not enumerate token-bearing rows or weaken RLS to obtain that attestation.
Secret-name metadata cannot establish equality/inequality of secret values.

Shared-desktop capability is declared but no desktop JavaScript, browser-control
or open-in-Codex tool is exposed here. The earlier signed-in browser evidence
belongs to that recorded session; it is not a current athlete browser session.
Direct HEAD requests to trainpacelab.com and api.github.com still receive proxy
CONNECT 403. Git reads and Base44 management reads succeed. Requests to four PR
checks pages returned 504, not test failures. No unchanged auth loop was retried.

Odysseus remains an independent protected project. Main still tracks its original
gitlink. Descendant PRs inherit its removal; no merge of that removal is permitted
without original-Mac history/dirty/untracked/ignored-file restore verification and
launcher dependency review. The archived pointer is not a backup. Nothing here
accessed or modified the original Mac project or ran its scripts.

## Validation and private evidence

The metadata inspection completed and evidence assertions verify four count-zero
responses, owner-scoped read schemas, both inactive staging workflow identities,
eight matching entry/helper graphs, three editor-source comparisons and the four
production entry-file comparisons. No new runtime code was changed, so no new
application-suite result is claimed. Documentation checks cover whitespace, local
links, stable task ID, private identifier/credential exclusion and tracking diff.
New exact-head CI must be checked independently after this documentation push.

Raw API source/metadata and exact identities are in the private cloud-setup/access-audit
folder outside Git with restricted permissions. Public evidence contains only
sanitized status, counts, function names and source revisions. See
[the delivery runbook](../../docs/DEVELOPMENT_TO_PRODUCTION.md) for access remedies,
release manifest requirements and rollback limits. Full G0 and release remain open.

## Single next atomic action

Continue TPL-G0-002 with an authorized, supported app-wide metadata attestation
that explicitly addresses owner-scoped RLS and the existing test webhook secret.
If that is unavailable, stop this acceptance item; do not jump to G3 or repeatedly
retry the blank Data surface. Original-Mac preservation remains independently required.
