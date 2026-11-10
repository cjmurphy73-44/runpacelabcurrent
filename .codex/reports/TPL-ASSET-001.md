# TPL-ASSET-001: source and local-file asset inventory

9 November 2026. One bounded inventory task; owner PR #6 on
`chore/codex-team-setup`, parent `15ad5f1760dbbdad0ea3d229e38cc13fcc7f0c0f`.
Inspected current UI source `b5a5d9233ca6d4409fd35141b17bb2eeb5a0d074`
against main `3f386d4d52042940cb1767e6950ec78e33b3c81e`.

## Deliverable

- docs/ASSET_INVENTORY.md traces actual placements, provenance limits and
  keep/rework/review decisions for 15 records, including six external photos.
- docs/assets/asset-inventory.json preserves structured source refs, local PNG
  dimensions/size/hash, external URLs and explicitly unknown remote measurements.
- Canonical backlog records the inventory and prioritizes the existing gate.

## Findings

Only one tracked raster: a 730-byte 300x300 TPL PNG. It was visually inspected
locally; creation commit 643783c describes temporary Garmin portal registration.
No source reference was found, but it is preserved for that separate use.
Favicon/touch/PWA references instead use one uninspected remote PNG; declared
192/512 sizes are not measured evidence. No original app-vector logo/wordmark,
local favicon/PWA set or actual product screenshot is tracked at the UI snapshot.
ProductPreview hard-codes illustrative metrics without a visible synthetic label.
Header casing differs; six remote photo rights/attribution and the shared remote
fallback's appearance/rights remain unverified. See inventory for scoped decisions.

## Boundaries and validation

No assets, runtime code, dependencies, credentials, deployments, private media,
Odysseus files or tracking were modified. No remote asset was fetched, no photo
quality/license clearance or hosted browser acceptance is claimed. External
design boards were not promoted into the app or treated as approved masters.

Executed validation: 15 unique asset IDs, six photo URL records, all referenced
source paths, exact local PNG hash/dimensions, 73 unique backlog task IDs, local
Markdown links and four parsed role TOMLs pass. Diff/whitespace inspection passes.
Only the inventory Markdown/JSON, task report and backlog change.

Local `npm run typecheck`, `npm run lint`, `npm run build`,
`npm run validate:backend` (48 graphs/27 resources) and `npm run test:ci`
(179 tests/27 files) pass using installed workspace dependencies. Existing npm
config, localhost test, three catalog RLS and build chunk-size warnings remain.
Published-tree equality and exact-head clean-install GitHub CI are separate
post-publication checks; report those with the final commit. No local command
here verifies remote photo rights, visual quality or hosted staging.

## Next atomic action

TPL-G0-002: establish scoped read-only evidence for the existing staging target,
privacy and inactive workflows if secure target access is available. Asset
implementation remains blocked by G0; TPL-ODY-002 still requires original-Mac
preservation/restore evidence before any removal-bearing integration merge.
