# TrainPaceLab atomic MVP backlog

Updated 9 November 2026. Canonical execution index, owned by the Product Owner.
Persist on existing setup PR [#6](https://github.com/cjmurphy73-44/runpacelabcurrent/pull/6)
until protected merge. Read with the approved [roadmap](DEVELOPMENT_ROADMAP.md)
and [MVP criteria](MVP_RELEASE_CRITERIA.md). The current delivery contract and
historical checkpoint remain on `fix/provider-connection-feedback` until merged.

## Run and evidence rules

- Select one eligible task, acquire an exclusive writer lock and stop within
  45 minutes. If acceptance cannot fit, split before starting using stable child
  IDs and one explicit scenario/surface; do not silently weaken acceptance.
- Each row defines a bounded deliverable. State is `ready`, `blocked`, `implemented`
  (not accepted), or `accepted` with exact commit, checks, review and applicable
  runtime evidence. An implementation or fixture pass is not a release pass.
- Gate labels are milestones, not tasks. `G0` means both pipeline PR 1 = GitHub #4
  and pipeline PR 2 = GitHub #5 are merged AND verified, with staging evidence,
  required independent reviews/checks and Odysseus preservation. `G1` through `G5`
  retain the roadmap order: security, billing, data, science/coaching, deletion.
- Newer Product Owner direction on 9 November authorizes safe isolated code and
  automated-test work while G0 isolation is pending. Select an eligible bounded
  task rather than another research-only run when safe implementation/testing is
  possible. Existing #7-#9 work still awaits acceptance; this direction does not
  waive security/billing/review/release gates, real-provider prerequisites or
  grant production authority. Gate completion claims retain their dependencies.
- No production deployments/data changes, credential exposure, direct main writes,
  protection bypass or self-approval. Use synthetic staging; private identity,
  credentials, health/GPS data and local preservation details stay outside Git.
- Preserve Odysseus in place. No delete, move or merge of its tracking removal
  without [verified preservation](ODYSSEUS_PRESERVATION.md). A gitlink is no backup.
- Reuse the owning branch/PR. Do not create a second implementation or duplicate
  the existing UX queue. Update this index and append one run report with tested
  SHA, commands/results, changed blocker and next ID. Never rewrite historical proof.
- Competitive Intelligence remains on-demand public research. A sourced brief
  exists at `docs/research/INITIAL_FIDELITY_BRIEF.md`; it is submitted research,
  not runtime evidence or approved engineering scope. New ideas require owner approval.

## Reconciled sources (observed 9 November, before this documentation commit)

| Track | Exact head | Existing owner / evidence and outstanding acceptance |
| --- | --- | --- |
| main | `3f386d4d52042940cb1767e6950ec78e33b3c81e` | None of #4-#9 is merged. |
| CI | `5db1f34f16d693d624bf754bfa6e28e4c2a7d182` | #5, `fix/ci-restoration`; exact-head run [42438784757](https://github.com/cjmurphy73-44/runpacelabcurrent/actions/runs/42438784757) succeeds; no submitted review. Includes Odysseus gitlink removal and invitation/schema changes requiring acceptance. |
| Staging | `ea36c7c78ae13a56b9eb2568bd976638549a7492` | #4 draft, `fix/staging-isolation`, stacked on #5; run [42470779725](https://github.com/cjmurphy73-44/runpacelabcurrent/actions/runs/42470779725) succeeds. Contains production-target alias fix absent from infrastructure head. |
| Infrastructure | `76b37bca2f8afca27f0d0e073bbc31f41f83436d` | Published `fix/tpl-infra-001`; no matching PR found in accessible PR search. Publication blocker cleared. Shares base `77e7116` with #4; adds only 3 entity name fields, guard + eight handler edits, and synthetic FIT test. No PR-triggered run returned; that endpoint does not enumerate every possible CI run. |
| Setup / plan | `93fc8325309b8f0445923aff04eb0e7aa7bc2e2a` | #6 draft, `chore/codex-team-setup`, stacked on #5; run 42464047602 succeeds. Owning PR for this backlog/inventory. |
| Guidance | `ad7d0a9d4e57885ede3d20f424e7f59a2ed853ed` | #7 draft, `fix/coach-hold-review`, stacked on #5; frontend + backend/entity batch. Live acceptance missing. |
| Export | `cf46f922e6adf7a332202cebad80c389e09945bd` | #8 draft, `fix/workout-export-recovery`, stacked on #7; JSON export, not FIT or proven watch import. |
| Provider/UI | `b5a5d9233ca6d4409fd35141b17bb2eeb5a0d074` | #9 draft, `fix/provider-connection-feedback`, stacked on #8; run 42465923203 succeeds. Source/UI fixtures and historical manual dashboard report do not prove hosted acceptance of this head. |

No submitted reviews were returned for #4-#9. This snapshot is not a current
branch-protection attestation. Refresh live heads before every write/review.
Infrastructure and #4 changes since their common base touch disjoint files;
that reduces textual conflict but does not prove combined runtime correctness.
Do not merge either stack wholesale. Infrastructure's schema names do not fix RLS.
The guard permits only explicit production plus opt-in, so a bounded staging
provider pilot is not currently supported by that guard; do not label staging
as production or bypass it. Design the authorized pilot separately after gates.

## Plan, preservation and reconciliation

Owner: engineering lead; original-Mac preservation requires the local operator.

| ID | Atomic deliverable | Depends on | Acceptance / state |
| --- | --- | --- | --- |
| TPL-PLAN-001 | Establish this index, source reconciliation and preservation inventory | User instruction | This run's documentation deliverable; exact evidence in `.codex/reports/TPL-PLAN-001.md`. Product gates remain open. |
| TPL-ODY-001 | Inventory tracked link and launch/runtime consumers | None | Source inventory recorded in ODYSSEUS_PRESERVATION.md; Mac dependencies remain unverified. Included in PLAN-001. |
| TPL-ODY-002 | Verify one private preservation/restore of the independent Mac project | ODY-001, original-Mac access | Blocked here. History/refs + dirty/untracked content restored and checked; original path untouched; sanitized attestation only. |
| TPL-REC-001 | Review eight guarded handler entry paths and test the fail-closed contract | Published infra head | Offline slice completed at [8bafa517](https://github.com/cjmurphy73-44/runpacelabcurrent/commit/8bafa5178d40f0748800a18c6583253aebc241a4): 57 handler cases plus four helper cases added; full 247-test suite and local required commands pass. No runtime code changed. [Report](https://github.com/cjmurphy73-44/runpacelabcurrent/blob/8bafa5178d40f0748800a18c6583253aebc241a4/.codex/reports/TPL-REC-001.md). No matching infrastructure PR/exact-head CI yet; no hosted or independent acceptance claimed. |
| TPL-REC-002 | Reconcile infra-only changes and #4 alias fix in owning staging PR | REC-001, ODY-002 | Blocked. Explicit file/commit plan preserves both fixes, existing tests and user work; no inherited removal merge before preservation. |
| TPL-REC-003 | Reconcile #7 backend/entity dependencies against staging candidate | REC-002 | Blocked. Record required entity/function/frontend batch and behavior conflicts; no blind stacked merge or broader permission work. |
| TPL-REC-004 | Reconcile #8/#9 frontend diff and current audit without changing semantics | REC-003 | Blocked. A single reviewed source manifest names frontend/backend heads; no combined-pass claim from old test reports. |

## G0: CI, isolation and exact-candidate acceptance

Owner: platform engineer + independent reviewer. All rows are blocked unless
stated ready. These are acceptance items, not authorization to deploy production.

| ID | Atomic deliverable | Depends on | Acceptance / state |
| --- | --- | --- | --- |
| TPL-G0-001 | Recheck #5 exact-head six-job CI and invitation/schema diff | None | Ready, existing implementation. Record jobs and warnings; no reimplementation of fixed typecheck. |
| TPL-G0-002 | Read-only verify existing staging target and inactive workflows | Secure target record/access | Partial live evidence in [sanitized report](../.codex/reports/TPL-G0-002.md): distinct Private staging, external workflows Inactive and listed platform connectors Disconnected. Follow-up lists only TPL_ENVIRONMENT/WEBHOOK_SYNC_SECRET; custom webhook-secret provenance is unverified. Data UI stays blank after one reload, blocking provider counts. Custom tokens, credential/data isolation and exact deployed source remain unverified; full acceptance blocked. |
| TPL-G0-003 | Verify anonymous/authenticated invitation fail-closed behavior | G0-002, reviewed #5 source | Synthetic 401/503 outcomes and no entity writes; Data UI/schema move checked. One endpoint per child run if needed. |
| TPL-G0-004 | Establish synthetic athlete A session and persisted profile | G0-002 | Supported identity creation; profile belongs to real authenticated synthetic user, reload succeeds; no fake created_by_id. |
| TPL-G0-005 | Establish distinct synthetic athlete B and coach sessions | G0-004 | Separate identities/profiles with sanitized role/ownership evidence, no invitations to invented recipients. |
| TPL-G0-006 | Validate the reconciled candidate offline | REC-004 | Exact SHA: typecheck, tests, lint, build, backend validation; disclose warnings and validator limits. |
| TPL-G0-007 | Verify candidate source/deployment identity on existing staging | G0-002, G0-006, explicit staging-write authority | Source manifest and private deployment identity match reviewed code; external sync remains off. No new staging clone. |
| TPL-G0-008 | Execute one synthetic FIT-to-dashboard/reload journey | G0-004, G0-007 | Raw fixture, persisted samples/metrics, reload and iPad/narrow UI agree; runtime failures stay visible. Stripe not required for this smoke. |
| TPL-G0-009 | Verify dedicated Stripe sandbox endpoint isolation | G0-002, secure sandbox config | Signed test event reaches staging only, test mode confirmed, no production touch; distinct from implementing billing integrity. |
| TPL-G0-010 | Record read-only production source/rollback checkpoint | Authorized read access | Version and rollback procedure recorded privately; do not execute rollback or publish. |
| TPL-G0-011 | Complete protected #5 acceptance/review/merge verification | ODY-002, G0-001/003/009/010, required review | Effective rules and reviewed exact head verified; approved protected merge only; recheck automatic sync effects. |
| TPL-G0-012 | Complete #4 retarget/acceptance/protected merge verification | G0-005/008/011, required review | Refresh #4 on main, rerun exact-head checks/affected staging acceptance, protected merge and post-merge verification. Only then G0 closes. |

## G1: security and ownership

Owner: platform engineer + security reviewer. Every implementation row is blocked
by G0; review one route/schema case per run. Close G1 only after all accepted.

| ID | Atomic deliverable | Depends on | Acceptance / state |
| --- | --- | --- | --- |
| TPL-SEC-001 | Inventory authorization-driving writes and service-role routes | G0 | Map actor/owner/grant checks, including legacy client links and coached caches; no trusting writable links. |
| TPL-SEC-002 | Remove one client-writable authority path | SEC-001 | Direct SDK spoof/write denied, owner journey retained, role authority remains platform-owned; split per path. |
| TPL-SEC-003 | Implement reviewed consent grant/revocation transition | SEC-002 | Athlete consent, authorized coach grant and immediate revoke; no automatic trust migration. Split grant and revoke when needed. |
| TPL-SEC-004 | Repair one catalog entity's explicit RLS | SEC-001 | Brand/ProductFamily/ShoeGeneration each gets a child case with intended reads/writes and remote denials, not only a name field. |
| TPL-SEC-005 | Validate one URL-fetch/service-role trust boundary | SEC-001 | Synthetic malicious/public/private URL and caller cases; deny unsafe fetch without provider side effects. |
| TPL-SEC-006 | Run one actor/route authorization matrix slice | SEC-002/003/004/005 | A/B/coach/revoked/admin/anonymous plus spoofed links and direct writes; record actual remote denials privately. Complete all slices before G1. |

## G2: billing integrity

Owner: backend engineer + billing/security reviewer. Blocked by G1. Never assume
transactions or locks the platform has not demonstrated; no live purchase pilot.

| ID | Atomic deliverable | Depends on | Acceptance / state |
| --- | --- | --- | --- |
| TPL-BILL-001 | Verify environment/mode/price/endpoint validation | G1 | Wrong-mode keys/events/prices fail before provisioning; sandbox-only fixtures and signed-event evidence. |
| TPL-BILL-002 | Enforce verified paid-event identity/amount | BILL-001 | Invalid signature/payment/identity/amount cannot grant access; positive sandbox event works. |
| TPL-BILL-003 | Establish durable webhook idempotency using supported primitives | BILL-002 | Duplicate/reordered/replayed event yields one entitlement; restart tested. |
| TPL-BILL-004 | Make access-code redemption single-use under concurrency | BILL-003 | Real supported atomic mutation demonstrated; two concurrent attempts have exactly one winner. |
| TPL-BILL-005 | Verify one subscription lifecycle transition per run | BILL-003/004 | Cancellation, renewal and failed-payment child cases show authoritative server access and honest UI; all accepted before G2. |

## G3: Garmin/COROS and recording fidelity

Owner: integration engineer + QA. Blocked by G2. TPL-DATA-001..005 remain roadmap
parents; rows below are execution slices. Duplicate each provider-specific case
for Garmin and COROS, using suffix `-GAR` / `-COR`; one provider/scenario per run.
Only approved, consenting provider pilots use private real data; synthetic staging
stays synthetic, with external sync disabled outside a separately authorized test.

| ID | Atomic deliverable | Depends on | Acceptance / state |
| --- | --- | --- | --- |
| TPL-INT-001 | Test one provider capability/access matrix (DATA-001) | G2, bounded pilot design | Raw-file/stream/recovery scope, device/activity/API tier, restrictions and unavailable fields have source/runtime labels. |
| TPL-INT-002 | Preserve one initial-ingest native recording (DATA-002) | INT-001 | Raw checksum, sample count, timing/units/channels/precision retained through athlete-owned storage; no average-fabricated stream. |
| TPL-INT-003 | Verify one historical pagination/retry case (DATA-003) | INT-002 | Page boundaries, stable IDs and resume avoid loss/duplicates; credentials stay private. |
| TPL-INT-004 | Verify repeat/webhook idempotent ingestion (DATA-003) | INT-003 | Same activity delivery has one correct record, retriable partial failures visible; one path per run. |
| TPL-INT-005 | Verify expiry/rate-limit/parse-failure recovery (DATA-003) | INT-004 | One failure per child task; never convert fetch/parser error into no-telemetry success. |
| TPL-INT-006 | Round-trip one long/sparse/paused recording fixture (DATA-002) | INT-002 | More-than-hour stream, missing channels, valid zeros, laps/duplicates and timestamps each have child fixtures; no silent sample cap. |
| TPL-INT-006-GAR-001 | Offline Garmin 3599/3600/3601-sample handler characterization | Explicit owner authorization for isolated automated tests | Implemented in [PR #9](https://github.com/cjmurphy73-44/runpacelabcurrent/pull/9), [f9b36c9](https://github.com/cjmurphy73-44/runpacelabcurrent/commit/f9b36c94b8c3d7594b72cad3f693b2bb4ea64461); 263 passed plus one explicit known-defect expected failure. Real handler/native decoder, synthetic bytes and serialized SDK fixture; 3601 stream omission reproduced, not fixed. No G3/runtime/provider acceptance or deployment. |
| TPL-INT-006-COR-001 | Synthetic COROS historical recording-fidelity matrix | Explicit owner authorization for isolated tests | Implemented in [3cefeb2](https://github.com/cjmurphy73-44/runpacelabcurrent/commit/3cefeb24633c4b5a2b36bea1a2bf03afd15e6044), existing PR #9. Real MCP/decoder/mapping with in-memory SDK/fetch; 14 passed, 4 explicit defect expected failures; no hosted/provider acceptance. |
| TPL-INT-006-GAR-002 | Fix Garmin full-recording retention with explicit storage limits/provenance | GAR-001 tests; owner explicitly prioritizes next safe runtime patch | **Next offline implementation.** All 3599/3600/3601 native samples survive supported storage/readback; native fields remain honest; oversize policy is explicit and cannot report success after silent omission. Preserve original/chunks or fail without partial writes under a justified storage contract. Convert the expected failure to a normal regression. Runtime/schema/security review and isolated hosted acceptance before release. |
| TPL-INT-006-COR-002 | Remove silent COROS long-stream prefix truncation | COR-001; GAR-002 shared storage-contract decision | Queued after Garmin. Full recording/sample coverage and explicit bounded outcomes; summary/zones/laps agree after readback; no unbounded cap increase or false success. |
| TPL-INT-006-COR-003 | Preserve native channels and valid zero through storage/readback | COR-001; storage/schema review | Queued after Garmin. Power-only recording remains usable after reload; per-sample power/zero and schema agree. Missing physiology must not fabricate zones; retain other measured channels through a reviewed recording/analysis distinction. |
| TPL-INT-006-COR-004 | Replace silent lap truncation with complete or explicit bounded retention | COR-001; storage-contract review | Queued. All 201 synthetic laps round-trip, or a reviewed explicit limit outcome preserves recoverability; never label a silently partial recording complete. |
| TPL-INT-006-COR-005 | Surface failed FIT download/parse separately from genuine no-file availability | COR-001 | Queued. HTTP/parse failure reports retry/error and provenance rather than errors=0 summary success; missing file and missing channels stay distinct. No provider or production contact required for an offline patch. |
| TPL-INT-007 | Verify one manual FIT/TCX/CSV import case (DATA-002) | INT-006 | Declared format matches parser; retained original and accurate channel/summary state; split by format. |
| TPL-INT-008 | Trace one activity to understandable athlete output (DATA-004/005) | INT-005/006/007 | Private source->raw->decode->persist->analysis->dashboard chain; source/freshness/completeness and next action visible. Both providers required for G3. |

## G4: deterministic analysis and useful coaching

Owner: science/backend engineer + domain reviewer. Blocked by G3. Preserve
Banister TRIMP vs Edwards/zone provenance and EWMA vs impulse-response semantics.

| ID | Atomic deliverable | Depends on | Acceptance / state |
| --- | --- | --- | --- |
| TPL-SCI-001 | Golden parity fixture for one frontend/backend metric | G3 | Same inputs, athlete constants, initialization, units/day boundary and rounding produce defined numeric/serialized parity; one metric per run. |
| TPL-SCI-002 | Verify one summary-only/missing-channel case | SCI-001 | Average TRIMP labelled; no-stream zone contribution excluded, not measured zero; missing history stays honest. |
| TPL-SCI-003 | Verify pending/failing coach does not block core access | SCI-002 | Workout/logging/import/analytics/dashboard still work; last verified history timestamp and exact roadmap fallback notice shown when applicable. |
| TPL-SCI-004 | Validate one plan-input/save failure path | SCI-003 | Complete inputs before mutation, tested supported atomic or fail-safe commit semantics; no partial active schedule. |
| TPL-SCI-005 | Complete recommendation->feedback->adjustment loop | SCI-004 | One justified recommendation and accepted/rejected adjustment tied to deterministic provenance, no invented physiology; remote synthetic evidence closes G4. |

## G5: account control and resumable deletion

Owner: backend engineer + security reviewer. Blocked by G4; production deletion
is never authorized by these tasks.

| ID | Atomic deliverable | Depends on | Acceptance / state |
| --- | --- | --- | --- |
| TPL-ACC-001 | Inventory all deletion/retention targets | G4 | Athlete records, service-created telemetry/assets, providers, subscription and declared retention enumerated; no compliance claim. |
| TPL-ACC-002 | Implement one checkpointed cleanup step | ACC-001 | Durable job state and idempotent retry; split provider revoke, billing cancel, files and entities into child tasks. |
| TPL-ACC-003 | Resume after one injected cleanup failure | ACC-002 | Restart completes remaining steps without duplicate destructive actions or false completion; repeat for each stage to close G5. |

## Frontend and UI/UX acceptance

Owner: frontend engineer + QA. Existing work stays `implemented`, not accepted.
New ordinary UI implementation requires G0; data, permission, billing or formula
changes additionally wait for their own gate. These rows reuse UX-001..006.

| ID | Atomic deliverable | Depends on | Acceptance / state |
| --- | --- | --- | --- |
| TPL-UX-001 | Verify shared guidance/session recovery in #7 (UX-001/002) | G0, reconciled #7 batch | Implemented, not accepted. Synthetic source-specific review, stale conflict, failed save and cross-view invalidation; no prescription change falsely claimed. |
| TPL-UX-001-COACH-MANAGE | Clear selected automatic conversation notices with visible touch controls | Explicit owner-prioritized UI change; existing reviewed API contract | Implemented on existing #9 branch at [6a329fa](https://github.com/cjmurphy73-44/runpacelabcurrent/commit/6a329fa8562c65f10c4de83180f3628b2172afee). Actual synthetic dashboard before/after captures; individual clear/keep, reload and keyboard/iPad/mobile checks pass. Full suite 281 passed plus five existing expected ingestion failures. Hosted reviewCoachSignal/CoachSignalReview remain absent; deploy the reviewed entity/function/frontend together only after isolation/authorization. No confirmed restriction or prescription is removed. |
| TPL-UX-002 | Verify JSON export pending/error/retry in #8 (UX-003) | G0, UX-001 | Implemented, not accepted. Browser click/retry/resource cleanup works; says download requested, never proves disk save or watch compatibility. |
| TPL-UX-003 | Verify provider connection/retry feedback in #9 (UX-004) | G0, UX-002 | Implemented, not accepted. Account switch, expired authorization, partial imports and empty sync each have explicit state/action; UI does not prove OAuth health. |
| TPL-UX-004 | Repair race-result onboarding contract | G0, science review where semantics affected | Existing defect. Correct distance/type contract; no fabricated default. One synthetic race case and reload; wider science change waits G3/G4. |
| TPL-UX-005 | Accept novice signup/profile/first useful dashboard | G0, UX-004 for race variant | One accepted synthetic account completes onboarding with confirmation; persisted state/reload, duration/friction recorded. |
| TPL-UX-006 | Show upload processing/complete/summary/failure (UX-005) | G3 | Existing source file context survives retry; confirmed summary-only distinct from retryable failure. |
| TPL-UX-007 | Explain provenance/freshness without new scores (UX-006) | G3, SCI-002 | One metric panel labels measured/estimated/missing, input date/model meaning and recovery action. |
| TPL-UX-008 | Preserve manual-entry draft across failed save/reload | G0 | One form autosaves safely per athlete; retry/account-switch behavior and keyboard flow tested. |
| TPL-UX-009 | Fix one iPad/narrow navigation or overflow defect | G0 | Actual page screenshot at agreed widths, keyboard/focus usable, no horizontal page overflow; split by surface. |
| TPL-UX-010 | Accept one modal/status accessibility case | G0 | Focus trap/return, names, contrast, live feedback and reduced motion tested; one dialog/state per run. |
| TPL-UX-011 | Make account management/export/support understandable | G2, G5 for delete claim | UI promises match tested subscription/export/deletion capability; no unsupported privacy or clinical guarantee. |

## Assets, logos and imagery improvements

Owner: frontend/design contributor + Product Owner. Work updates existing assets
as well as filling gaps. No new brand expansion or broad redesign. Implementation
waits G0; source/license inventory is ready now. Actual surfaces and editable
originals matter more than generator output. Map to roadmap TPL-BRAND-001..004.

| ID | Atomic deliverable | Depends on | Acceptance / state |
| --- | --- | --- | --- |
| TPL-ASSET-001 | Inventory one asset family (BRAND-001) | None | Source/local-file inventory complete: [ASSET_INVENTORY.md](ASSET_INVENTORY.md) and [15 structured records](assets/asset-inventory.json). One temporary registration PNG preserved; six photo URLs, identity/icon/social references and illustrative preview mapped. Remote rights, dimensions, quality and hosted layouts unverified. No asset or runtime change. |
| TPL-ASSET-002 | Update original vector logo/wordmark set (BRAND-002) | G0, ASSET-001 | TrainPaceLab-only mark and wordmark, mono/light/dark variants, editable original and small-size legibility. Split mark and wordmark if needed. |
| TPL-ASSET-003 | Update favicon/app/PWA icon references (BRAND-002) | ASSET-002 | Required sizes and manifests match actual assets; loading, touch/header and iPad/split-screen clipping checked. |
| TPL-ASSET-004 | Improve one imagery/illustration surface (BRAND-003) | G0, ASSET-001 | Purpose, relevance, quality and lawful provenance; stress/response illustration clearly synthetic, no fabricated athlete evidence; rework or omit weak imagery. |
| TPL-ASSET-005 | Replace one stale product screenshot (BRAND-003) | G0, accepted surface | Actual current UI with synthetic/consented data, no private metadata, readable mobile/desktop crop; store editable source/provenance. |
| TPL-ASSET-006 | Optimize delivery of one asset family (BRAND-004) | ASSET-003 or ASSET-004 or ASSET-005 | Appropriate dimensions/responsive variants/formats, explicit sizing/loading priority and cache behavior; no broken URLs. |
| TPL-ASSET-007 | Verify asset accessibility in one actual surface (BRAND-004) | ASSET-006 | Alt/decorative semantics, light/dark contrast, reduced motion and narrow/iPad layout pass, with screenshots. |
| TPL-ASSET-008 | Measure asset payload and layout impact (BRAND-004) | ASSET-007 | Before/after bytes and layout-shift/loading evidence against recorded budget; no unsupported performance claim from compression alone. |

## Testing, operations and launch acceptance

Owner: QA + engineering lead; Product Owner controls beta/release decisions.
Documentation or a green build never substitutes for the required runtime proof.

| ID | Atomic deliverable | Depends on | Acceptance / state |
| --- | --- | --- | --- |
| TPL-QA-001 | Validate one reproducible exact-candidate evidence manifest | REC-004 | Commands, code SHA, environment class, warnings, expected/actual results and sanitized evidence links; fixture/manual/remote separated. |
| TPL-QA-002 | Verify one supported-file promise against a real synthetic file | G3 | Import/export/UI format names agree; unsupported file gets actionable failure; one format per run. |
| TPL-QA-003 | Repair one offline-queue recovery/persistence scenario | G0, G1 for protected writes | Account-scoped pending state survives restart; safe retry and clear partial/failure state; not advertised until verified. |
| TPL-OPS-001 | Verify one durable automation run and exclusive writer ownership | Manual validated run, supported scheduler | Correct repo/environment, bounded task, actual result and no concurrent writer; saving config alone is not activation. Do not execute legacy loops. |
| TPL-OPS-002 | Review sanitized failure/support telemetry for one path | G1, explicit scope | Useful retry diagnostics without raw health/GPS, credentials or private account metadata; no new analytics provider by default. |
| TPL-REL-001 | Complete Garmin and COROS launch evidence matrix | G0/G1/G2/G3/G4/G5, UX and asset acceptance | Each provider independently passes actual authorized initial/repeat/recovery journey; field restrictions labelled, no universal coverage claim. |
| TPL-REL-002 | Prepare one small consenting beta and measures | REL-001, owner approval | Invitations/data handling approved; defined activation/repeat sync/duplicates/support/paid metrics with denominators; no invented targets. |
| TPL-REL-003 | Assemble release decision packet | REL-002 | Critical defects closed, required reviews/checks and rollback evidence, accurate known limitations. Product Owner decision required; no production deployment in this backlog run. |

Deferred: new wearable providers, broad coach/team tooling, advanced model
comparison UI, large analytics expansion and Base44 replacement. Retain useful
existing code without expanding or advertising unverified capability. Research
recommendations do not enter this index as approved work automatically.

## Earlier next-run checkpoint (superseded by the metadata follow-up below)

**TPL-G0-002 was externally blocked** on a supported metadata-only provider-count
and credential-isolation read path. Data management rendered blank and one reload
did not recover it; no page-scoped read tooling was exposed. Management-browser
access works, but CLI authentication is not established. Resume only when the
Data UI or scoped management tooling is available, returning sanitized counts/
status rather than token fields or health records. Do not repeatedly retry the
unchanged blank page, replace the configured webhook secret or infer credential
isolation from secret names. G0 and original-Mac preservation in TPL-ODY-002 remain
open; no integration/removal merge is unlocked.


## Run update: TPL-REC-001, 9 November 2026

Infrastructure branch now has test-only commit `8bafa5178d40f0748800a18c6583253aebc241a4`
after the original reconciled snapshot. Its published tree matches the locally
tested tree. The real eight handler entry/import graphs ran in isolated VM
fixtures: 503 before side effects for staging/missing/denied environments;
OAuth/action/webhook routing blocked; synthetic status remained read-only.
Full local suite: 247 tests/31 files; typecheck, lint, build and backend validation
pass. Existing RLS/localhost/npm/bundle warnings remain. No real SDK/provider,
remote staging, ownership or production-enabled behavior is certified. No
matching infrastructure PR was found, and no PR-triggered exact-head run was
returned; do not claim CI success. PR #4 separately advanced to `832e038` with
preservation documentation only. No integration, deployment, runtime-code or
Odysseus tracking change was made by this task. G0 remains open.


## Run update: TPL-ASSET-001, 9 November 2026

Source/local-file inventory covers 15 records at UI head b5a5d923. The only local
raster is a temporary Garmin-registration TPL PNG, preserved in place. Favicons,
touch/PWA and social images are remote references with unverified bytes/rights;
six Unsplash URLs need individual provenance and relevance review. ProductPreview
is synthetic code/data without a visible illustrative label. No remote photo was
fetched or judged, no logo was selected from external design boards, and no asset
was deleted, redesigned or deployed. The inventory maps existing ASSET-002..008
work; it does not create new scope or unlock G0. CI branch 5750f63 adds source-only
acceptance documentation and does not establish fresh hosted invitation evidence.

## Run update: TPL-G0-002, 9 November 2026

The user completed secure browser sign-in/device approval. Fresh authenticated
Base44 management UI distinguishes staging from production, shows staging Private,
both scheduled external workflows Inactive, workflow Activity No runs yet and
GitHub API/Airtable app connectors Disconnected. This is actual UI evidence, not
repository-note inference. It does not certify custom Garmin/COROS token state,
credential/data isolation, exact deployed code or hosted synthetic athlete/FIT
acceptance. See the sanitized task report for precise limits. No app configuration,
workflow, connector, data or deployment was changed, and no private identifiers
or authentication artifacts were added to Git. Task remains partial; G0 stays open.

### TPL-G0-002 follow-up

Application Secrets lists only TPL_ENVIRONMENT and WEBHOOK_SYNC_SECRET. No
Garmin/COROS/Stripe credential names or external-sync enable flag are listed,
but runtime values and custom entity tokens are not certified. The configured
webhook secret's origin/test isolation remain unverified. The Data management
surface stayed blank after one reload, so no connection-table counts could be
read. No values were copied into public evidence and no provider/health records
were opened. Task is externally blocked on a supported metadata-only read path;
stop unchanged retries and preserve all existing app configuration.


## Run update: TPL-G0-002 metadata-only follow-up, 9 November 2026

Supported management API access now supplies names-only secrets, function source,
workflow list/detail identity and count-only connection reads. Four connection
counts are zero for the caller, but their owner-scoped RLS prevents an app-wide
empty-table claim. Eight staging entry/helper graphs match infrastructure 8bafa517;
three editor files match staging candidate a2dd360 rather than current #9 a6f5a15.
Production site and backend entry revisions differ; a single Git SHA is not a
complete release manifest. No records/token fields, secret values, provider
requests, configuration writes, publishing or Odysseus changes were performed.

The former missing-count-tool blocker is narrowed, not full G0 acceptance.
Continue G0-002 with an app-wide isolation attestation that addresses owner RLS
and existing test-webhook provenance. Network access, authenticated hosted athlete
acceptance, independent review and original-Mac preservation remain open. The
Garmin 3599/3600/3601 characterization and separate COROS fidelity case stay
prioritized behind their documented prerequisites; no gate was bypassed.

Evidence: [.codex task follow-up](../.codex/reports/TPL-G0-002-metadata-followup.md).
Process/access steps: [delivery runbook](DEVELOPMENT_TO_PRODUCTION.md). Historical
entries above remain observations at their recorded sources, not current state.

## Prior next-run checkpoint (superseded by active implementation direction below)

Continue **TPL-G0-002**: obtain a supported app-wide isolation attestation
accounting for owner-scoped counts and the existing test webhook secret. The
count-only API now works; do not retry the blank Data UI or interpret caller-zero
as global-zero. If the remaining attestation is unavailable, record the precise
external blocker and stop; G0, the review gates and TPL-ODY-002 stay open.


## Run update: TPL-INT-006-GAR-001, active implementation direction

The owner authorized safe isolated code/tests while G0 is unresolved, retaining
production, billing, security, review and Odysseus controls. A runnable test was
completed rather than another source-only audit. Existing PR #9 now executes
the real Garmin webhook/native FIT path with synthetic 3599/3600/3601 records.
The first two preserve currently mapped samples; 3601 decode but are omitted
from the serialized create payload despite a success response and measured zones.
The desired full-retention assertion is explicitly expected to fail, and fails
when run ordinarily. No ingestion/runtime behavior was changed or deployed.

Local required checks pass; full suite has 263 passed and one expected failure
across 43 files. Exact-head CI/review remains separate. Details and changed files
are in PR #9's .codex/reports/TPL-INT-006-GAR-001.md. This child does not certify
TPL-INT-006, G3, remote persistence, provider health or full native-channel fidelity.

Next safe atomic development scenario: a separate COROS recording/cap round-trip
characterization using synthetic data. G0 isolation work continues through
app-wide RLS-aware metadata attestation and test-webhook provenance; the owner
was asked for provenance only, never the secret value. Those acceptance gaps
must not indefinitely block unrelated safe offline development. No staging
publication until isolation/authorization are verified. No production deployment
until release gates pass and the owner separately approves it.

## Next run

Implement **TPL-INT-006-GAR-002** next on existing PR #9: fix the reproduced
3601-sample retention defect with a supported complete-recording storage policy,
explicit limits/provenance and regression coverage. No more research-only task
in place of this eligible offline runtime patch. COROS fixes follow per rows above.
Continue G0 isolation/hosted acceptance and frontend/backend release-manifest work
at their proper steps; missing remote access must not block unrelated safe code.
No deployment or approval bypass; preserve all roadmap tracks and Odysseus.


## Run update: TPL-INT-006-COR-001, 9 November 2026

COROS historical sync now has 18 executable cases in existing PR #9 at 3cefeb2:
14 pass and four explicitly reproduce desired-contract failures. Source path is
real MCP handshake/record extraction/download, native FIT parsing, normalization
and serialized SDK bulkCreate; all network/auth/persistence is synthetic/in-memory.
Coverage includes 3599/3600/3601 samples, two-hour 7201 points, laps and 201-lap cap,
timestamps/gaps, native units/zeros, missing HR/power/file, HTTP/parse failures,
and matching sequential/same-response duplicates. No concurrent/stable-provider-ID
dedup, hosted byte limits, real-provider health or browser reload is certified.

Confirmed defects: long samples truncated to 3600, per-sample power dropped
(invalidating a saved power-only stream), laps capped at 200, and file failures
reported as error-free summary import. Each new desired assertion was independently
run without .fails and fails on current code. Missing physiology also causes other
measured file channels to be lost by fallback; the channel-retention child records
that distinction. Full local suite: 277 passed, five expected failures, 44 files;
typecheck/lint/build/backend validation and syntax checks pass with known warnings.

GAR-002 is the next actual runtime fix, followed by the four COROS implementation
children. This is not product acceptance or permission to deploy. G0 attestation,
required reviews, original-Mac preservation, component manifests/rollback, hosted
acceptance and separate production approval still apply to release. No Base44
app/backend/schema/secret/workflow, production data or Odysseus change occurred.


## Owner-prioritized visible coach-guidance management

Existing PR #9 now has actual per-notice clear/keep controls and dated selection,
not only a report or mockup. Real React dashboard captures with synthetic data
are committed under docs/evidence/coach-guidance. The planned running workout
remains accessible; failed/unconfirmed saves do not clear notices. Shared state,
stale source selection, keyboard focus and narrow layout are checked. The backend
review contract already supports selected keys; it and its entity are absent from
both hosted apps and must be included in the reviewed staging batch. No hosted
deployment or production data change occurred. Garmin retention (GAR-002) remains
the immediately next implementation; the roadmap is not replaced by this UI item.

The owner also approved the GitHub Actions runner alternative and requested an
independent Option B migration assessment. The existing hourly ChatGPT Scheduled
task was not duplicated or modified: no scheduler-control tool is exposed. The
official Codex Action needs secure API-key setup and a reviewed manual workflow
first; no second schedule or production automation is activated. Git access now
works with the configured credential via environment-only Bearer authentication,
so the earlier default/Basic failure is not a continuing write-access attestation.

Option B is recorded as a gated Base44-independence candidate, not a current
migration task or promise of free hosting/zero lock-in/six-hour delivery. See the
assessment linked from the roadmap. Keep all MVP, security/billing, review, native
fidelity, hosted acceptance, rollback and original-Mac Odysseus requirements.
