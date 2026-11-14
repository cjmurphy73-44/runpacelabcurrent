# Science 2.9: joined staging acceptance and Base44 support handoff

## Verified read-only evidence

- Draft PR #188 exact SHA `7d989c81d50ba0fb10f3be9fcf59b442df5e5a11` passed CI `43650879854`.
- Draft #149 advanced to `ac2f67d8e2ff836755202812054b40fafb0bc2d1` with successful exact-head CI `43650872092`. Draft #172, #175, #177, #179, #181, #183 and #185 also have successful exact-head runs at the inspected commits. All remain open and draft; science branches are stacked, #149 is parallel.
- Prework staging checkpoint `6af8e8f8180200ed2fd41ee3` at sandbox revision `8b99e02ba97247cdc6a52008c9e99779e476a18c`. Later read-only status returned `81d97573ec04d56d91def33d829c168d57cec8d5`, showing concurrent sandbox revision changes. No staging source edits were performed and no checkpoint was restored.
- Backend function listing still returns `{truncated:true}`. The earlier testing-agent execution failed on published staging. Exact function deployed revisions, database/auth tenant boundaries, effective SDK origin and temporary test-user routing are **not attested**.
- Base44 catalog still exposes no support-ticket submission operation. The detailed request at `docs/SCIENCE_2_3_BASE44_SUPPORT_REQUEST.md` remains ready for **manual submission**, without secrets or athlete data.

## Targeted improvement

Prior science checks independently classified a browser execution, tenant provenance and preview/published function deployment. A caller could mistakenly treat one passing check as full acceptance. The new pure `assessStagingAcceptance` joins all three and checks that the attested app IDs agree. Six offline tests reject absent tenant evidence, missing published route, failed execution, internally consistent but wrong-app tenant or function evidence, and a published staging browser URL. A synthetic complete aligned set passes. This does **not** create real platform attestation or authorize athlete testing.

## Safety

No athlete records or secrets accessed; no live function calls, staging source writes, production changes, merges, deployments or Odysseus modifications. Rest confirmation and unvalidated persistent science writes remain disabled. Obtain written Base44 isolation evidence before proceeding with authenticated acceptance.
