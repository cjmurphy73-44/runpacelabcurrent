# Science 2.4: staging routing and support handoff

## Verified GitHub and preservation

- PR #177 exact head `0d939e6ad147088bc0000e98043f148ac7c587cf`: CI run `43643565708` completed **success** (typecheck, tests, build and release source-map check).
- Draft dependency status checked: #149, #172, #175 and #177 all remain open and draft. PR #149 has advanced to `50cf63784a8780fe1f205f111adaff40b06c25e4`; do **not** rely on the older #149 CI result to certify that newer head.
- Staging app `6aefe9d09e2788fc8591c758` prework checkpoint `6af8d53ba6b23ec0db9d5bc5`, sandbox revision `4fd880a0ff7c588e0530cf10d1dee75120f4b642`. Later read-only status reported sandbox revision `d443eb0331ce546f9c15553303b5e862123c5d91`, indicating concurrent sandbox changes; this work did not write staging source. Preserve both checkpoint and independent Odysseus files/history; no Odysseus paths were touched.

## Read-only platform investigation

- The available Base44 API catalog exposes preview URL, app status, test-agent execution, backend-function listing and function logs, but **no support ticket submission or independent per-function deployed-revision endpoint** was found. No support request was submitted.
- The backend-function listing remains truncated; a sandbox Git revision or `ready` status is **not** a deployed function revision.
- Previous staging published worker logs showed historical `durationMinutes` and `dailyTSSHistory` bundled errors. They cannot prove current routing. Empty preview logs cannot prove isolation or worker health.
- Base44 app ID separation is known; independent database namespace, auth tenant, effective SDK backend origin, test-agent dev-data routing and published-vs-preview function revisions are **not** independently attested.
- No athlete records, credentials, secrets or PII were fetched. No live backend requests were made.

## Regression hardening

Added `stagingFunctionRoutePair.ts` and six targeted tests. The pure helper rejects missing preview/published attestations, wrong target environment, mismatched function names/app IDs, stale deployed revisions and absent platform attestations. It only accepts independent exact-revision evidence for both staging targets. It does not infer anything from published HTML, a source commit or a successful CI run.

## Support request and next gate

The full, actionable request remains at [SCIENCE_2_3_BASE44_SUPPORT_REQUEST.md](SCIENCE_2_3_BASE44_SUPPORT_REQUEST.md). Submit manually through an authorized Base44 support channel and ask for **written** proof of the independent database, authentication, testing-agent and function-routing boundaries, plus the exact deployed revisions and a read-only zero-write audit method. Do not transmit secrets or athlete data.

Before authenticated Physiology Lab acceptance, obtain authoritative isolation confirmation and a working temporary test-user flow; compare before/after audit data from the **same** isolated dev/test namespace. Keep rest writes and unverified calculations disabled. Do not merge or deploy.
