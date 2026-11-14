# Science 2.8: exact preview-host acceptance and isolation blockers

## Verified

- Draft PR #185 exact head `6f494c1a725ea0d8152c10038dbdaa354efe0a27` passed GitHub Actions `43650580271`. Earlier missing CI was a reporting/timing delay, not an observed build failure.
- Current draft #149 head `a1b6373defe96c51372b4e30fad6132f9ddf9d1c` passed `43650565231`. Draft #172, #175, #177, #179, #181 and #183 also passed exact-head CI at the inspected commits. All remain open/draft. Science changes are stacked; #149 is parallel.
- Staging prework checkpoint `6af8e764387a15692e33cdf6` saved at `b5465e16fba226030172ada4a30c9dd31947a140`. A subsequent read-only status returned `398f31613e96322ff6cf170cb086ef73cc0dc5bc`, confirming **concurrent sandbox revision drift**. Do not overwrite or restore the checkpoint without reconciliation. No staging source files were written by this task.
- Read-only backend-function listing still returns `{truncated:true}`. A prior staging test execution `6af83c91a23233e22ea34416` remains `failed`, reason `platform`, on the published staging URL. No independent auth tenant, database namespace, testing-agent dev-data routing, SDK origin, function deployed revision or zero-write audit has been attested.
- No authorized support-ticket action was found in the Base44 catalog. The prepared request remains at `docs/SCIENCE_2_3_BASE44_SUPPORT_REQUEST.md` for manual submission.

## Justified fail-closed improvement

The Science 2.7 execution-metadata classifier accepted any HTTPS `*.base44.app` URL as a syntactically trusted test host, including **published staging** and unrelated apps. Science 2.8 now requires the exact `preview-sandbox--<expected staging app ID>.base44.app` hostname, HTTPS, and no URL credentials or alternate port. Synthetic regression tests reject published staging, wrong app, unrelated Base44 hosts, deceptive suffixes and credential-bearing URLs. Even an accepted completed preview execution still sets `isolationProven=false`; the separate independent tenant and zero-write acceptance gates remain mandatory.

## Safety

No athlete data, staging code, Odysseus, production, secrets or live functions were touched. No merge or deployment. Keep rest confirmations and legacy training-load/persistent CTL/ATL writes disabled until independently verified.
