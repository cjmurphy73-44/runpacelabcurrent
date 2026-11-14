# Science 2.7: Base44 staging acceptance handoff

## Verified read-only evidence

- Draft PR #183 exact SHA `8283ae9aa6d39e32408353734eb370abc4cfba11` passed CI `43645217898`.
- Current draft #149 SHA `710cd1ad71d1d06e084d48f428e0b975403ca23c` passed CI `43645144595`. Draft #172 (`533a5f42`), #175 (`f5212159`), #177 (`0d939e6a`), #179 (`c975ff9f`), #181 (`50bd81a0`), #183 (`8283ae9a`) also have successful exact-head CI at the inspected commits. All target main; the science branch contains stacked work. #149 is parallel and must be reconciled separately before merging.
- Prework staging checkpoint `6af8e63a81efe310fc94b523` at revision `f45dda54aaea430223d746f83947db4bd3745ee2`. An initial read-only status check matched. A later status check returned **`7110d30698541a8c1152696be3a989e811fe402e`**, an intervening concurrent sandbox revision change. Do not assume the checkpoint describes the current sandbox or overwrite concurrent work.
- Read-only Base44 execution `6af83c91a23233e22ea34416` (staging app ID `6aefe9d09e2788fc8591c758`) attempted the **published staging** `/Physiology` URL, status `failed`, failure reason `platform`, goal not accomplished, flow role `user`, app commit `18cf83fa85d84c228d99ac38ecc3ea0159f80204`, `credits_charged=0`. This is **not** evidence of authenticated testing or independent dev/test data.
- The available Base44 API catalog has no authorized support ticket submission action or authoritative read-only function name-to-deployed-revision lookup. The backend-functions listing previously returned `{truncated:true}`. Separate app IDs and a ready sandbox do not prove independent database, auth tenant, SDK origin, test-agent data routing, or function revisions.

## Regression improvement

`testExecutionMetadata.ts` is a pure read-only classifier. Its tests reject failed, unfinished, cross-app, stale-commit and untrusted-host runs. Even a synthetic completed run reports `isolationProven=false`, so execution metadata cannot satisfy the independent environment acceptance gate. No backend requests, secrets, athlete data or writes are involved.

## Manual support handoff

Submit the prepared [Base44 support request](SCIENCE_2_3_BASE44_SUPPORT_REQUEST.md) through an authorized support channel. Include the staging app ID, three named worker routes, and test execution ID above. Ask for: (1) non-secret effective preview/published database namespace identifiers and guarantees, (2) authentication tenant and temporary-user boundaries, (3) whether explicit published `site_url` uses published rather than isolated test data, (4) per-target function deployed revisions and supported read-only retrieval, (5) supported authenticated preview testing and zero-write audit. **Do not include credentials, athlete records or private tokens.** No ticket was submitted in Science 2.7.

## Safety

No athlete records accessed, no Base44 source changes, no production writes, no merge or deployment, and no Odysseus files modified. Keep rest confirmations, legacy training-load calculation and persistent CTL/ATL writes disabled until independent evidence is obtained.
