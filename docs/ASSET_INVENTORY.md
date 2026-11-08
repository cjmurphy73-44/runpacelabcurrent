# TrainPaceLab asset inventory and improvement decisions

TPL-ASSET-001, 9 November 2026. Machine-readable companion:
[assets/asset-inventory.json](assets/asset-inventory.json).

Scope: tracked web assets and their actual source placements at UI branch head
`b5a5d9233ca6d4409fd35141b17bb2eeb5a0d074`. Compare main
`3f386d4d52042940cb1767e6950ec78e33b3c81e`; do not infer deployed assets from Git.
This is a source/local-file inventory, not a live page, remote-image or licensing
clearance. No image was deleted, replaced, generated or deployed.

## Identity and app delivery

| ID | Asset / actual use | Provenance and measured evidence | Decision and next acceptance |
| --- | --- | --- | --- |
| A01 | `public/assets/logo-300x300.png`; no tracked source reference found | Inspected PNG: 300x300, palette mode, 730 bytes. White TPL letters on a solid dark square. SHA-256 `8e646642ba7f4555fb0282246c70b9ebd36298ef90ec909a4f6e6314f966822c`. Commit `643783c` explicitly calls it a temporary Garmin portal-registration image. Designer/rights unverified. | **Keep and preserve.** Its registration purpose may be independent of the web UI; do not delete it as apparently unused. ASSET-002 should supply an original editable mark/wordmark and variants rather than assume this is the approved master. |
| A02 | Remote `7256cbdc0_logo.png`; favicon and Apple touch icon in index.html, both PWA entries in manifest | Four references to one Base44-media URL. Manifest declares 192x192 and 512x512, both purpose any. Remote dimensions/bytes/appearance not fetched; relationship to A01 unverified. | **Rework after G0.** ASSET-003: actual correctly sized local outputs, appropriate maskable treatment if supported, explicit references, small-size/light/dark/touch verification. Do not claim declared sizes are measured sizes. |
| A03 | Remote `8d3ccd7c8_generated_image.png`; Open Graph image | URL in index.html:17. Filename alone does not prove creation method, ownership, resolution, contents or fitness for social crops. No editable original in tracked asset set. | **Review/rework after G0.** ASSET-004/005: original or properly licensed social image with clear brand, safe text area, actual dimensions and synthetic product data. |
| A11 | Lucide Activity glyph plus text; public header, app header and public footer | Source-rendered vector library icon, not a bespoke brand master. Installed lucide-react package declares ISC; retain its notices. Public text is TrainPaceLab; app header says Trainpacelab at AppLayout.jsx:48. | **Keep functional icons; update identity separately.** ASSET-002 should unify spelling and apply an original mark/wordmark, retaining responsive behavior. No trademark exclusivity is inferred from a library glyph. |
| A12 | GoogleIcon.jsx and AppleIcon.jsx; inline sign-in provider marks | Editable inline SVGs. Provider branding approval/use conditions are not recorded in the inspected source. They are provider identifiers, not TrainPaceLab logos. | **Preserve pending provider-branding review.** Do not recolor or incorporate into the new app mark. Check actual provider rules before changes. |
| A13 | Inter and JetBrains Mono; external Google Fonts CSS import in src/index.css:1 | Family names and weights recorded. No local font binaries or font-specific license records in the tracked asset set. Network availability and font delivery not measured. | **Retain pending delivery/license review.** ASSET-006: verify provenance/terms, fallback behavior, layout impact and whether local delivery is appropriate; no performance claim yet. |

No tracked original app-logo SVG, standalone wordmark, mono/light/dark logo set,
favicon ICO/SVG, local 192/512 icon set, maskable icon or product screenshot was
found in this source snapshot. Inline provider/chart SVGs are distinct from these
missing deliverables. Only one tracked raster asset exists; there is no pair of
local raster files to deduplicate. Remote assets may duplicate each other or A01,
but that cannot be established without inspecting their bytes.

## Landing imagery

All six photos are direct images.unsplash.com URLs. The source comment calls
them real photography; photographer pages, individual license/attribution records,
consent/releases and current crops are not verified here. Hosting on Unsplash does
not by itself establish a particular image's rights for every intended use.
No assessment of photo quality or alt-text accuracy is made without viewing it.

| ID | Photo URL identifier | Actual source placement | Decision |
| --- | --- | --- | --- |
| A04 | photo-1452626038306-27d8e0dbf6e4, requested width 1400 | Landing.jsx:190, physiology explainer, 4:3 class; despite its HERO_IMG variable name, the top hero uses ProductPreview | **Review rights/relevance**, then keep, replace or omit. Alt currently claims a runner on an open road at golden hour; verify against the actual image. |
| A05 | photo-1556909114-44e3e9399a2e, width 1000 | First Bring in your data step card | **Review rights/relevance**; the image should clarify the data action or be omitted. |
| A06 | photo-1571008887538-b36bb52f967a, width 1000 | Second We model your physiology step card | **Review rights/relevance**; an athlete photo is not evidence of model validity. |
| A07 | photo-1486218119243-13883505764c, width 1000 | Third adaptive-plan step card | **Review rights/relevance**; avoid imagery implying a demonstrated automated plan outcome before acceptance. |
| A08 | photo-1552674605-db6ffd4facb5, width 1000 | Recovery quote section, 4:5 class | **Review rights/relevance**; do not imply the pictured person supplied a testimonial or achieved an outcome. |
| A09 | photo-1461896836934-ffe607ba8211, width 1200 | Concept/rationale section, 4:3 class | **Review rights/relevance**; alt currently claims shoes on a track and must be checked against the photo. |

Record photographer/source page, permitted use, attribution and review date before
approval. Improve one actual surface per run; prefer omission over a weak or
misleading image. Do not fetch private athlete media to fill these gaps.

## Illustrations, screenshots and runtime imagery

| ID | Surface | Evidence / decision |
| --- | --- | --- |
| A14 | Landing ProductPreview.jsx | React/Recharts mock, not a real product screenshot. Hard-coded eight-week trend plus fitness 58, form +28 and readiness 82. Source renders no visible illustrative/synthetic label. **Rework after G0**: label the example explicitly or replace with an accepted synthetic product capture. Do not present it as measured athlete data or verified model output. |
| A10 | Shared image fallback, static.wixstatic.com URL in ui/image.jsx | Remote placeholder used for missing/failed images. Bytes, appearance and rights unverified. Source keeps the original alt after replacement, so the replacement may not match it. **Rework after G0**: honest accessible unavailable state, no misleading substitute imagery, and verify repeated-load failures. |
| A15 | MFA QR, workout/recovery OCR previews | Runtime/user-provided images, not brand assets. **Exclude** from marketing capture or public inventory. Do not collect QR secrets, private screenshots or health/account data. Use sanitized synthetic fixtures for future tests. |

Existing application charts (for example PaceTrendChart, recovery charts,
LoadFatigueChart and OdeFitnessFatigueChart) render from code/data. Preserve their
science/data contracts; do not replace real charts with decorative generated
graphics. No reusable stress-response brand illustration was found. Future
illustrations must distinguish EWMA and impulse-response concepts and clearly
state that illustrative curves are not athlete measurements.

Related copy risk: Landing's feature grid still promises direct .fit watch export,
while PR #8's exporter is labelled TrainPaceLab JSON. Asset/screenshot work must
not reinforce this unsupported compatibility claim. Fixing that copy is separate
approved UI work; no copy or behavior change is included in this inventory.

## Delivery and accessibility observations

- The shared Image component builds measured Wix/Base44 transformations and DPR
  variants. Unsplash URLs take its plain-img branch, so that component does not
  add srcSet, sizes, lazy loading or numeric dimensions to them. The URL query
  requests a format and width, but this is not a measured mobile-payload budget.
- Landing callers provide CSS aspect ratios or height classes, not originWidth /
  originHeight. Some space is reserved by CSS; actual layout shift and cropping
  require browser checks. Do not report a CLS pass from source alone.
- The photo calls have nonempty alt strings, but step photos repeat heading text.
  Decide per image whether it is decorative or contributes a real description;
  a nonempty alt is not automatically useful or accurate.
- Reveal.jsx respects useReducedMotion. This is a source capability, not a full
  animation/accessibility pass; check charts and all actual asset surfaces too.
- No remote-image payload, original dimensions, LCP, CLS, caching, light/dark
  legibility, favicon rendering, PWA installation or actual iPad layout was tested
  in this inventory. Those belong to ASSET-003 and ASSET-006..008 acceptance.

## Ordered improvement handoff

1. ASSET-002 after G0: original mark/wordmark and casing consistency. Keep A01
   intact pending registration-use confirmation. Retain editable originals and
   provenance; inspect small sizes on actual headers and both themes.
2. ASSET-003: generate/verify favicon, touch and PWA assets from that reviewed
   master and wire local references with measured file dimensions.
3. ASSET-004: resolve photo/social/fallback provenance and improve one relevant
   imagery surface. Rework or omit weak imagery, with no invented outcome claim.
4. ASSET-005: visibly labelled synthetic example or genuine synthetic product
   screenshot on an accepted UI; capture no private user/account metadata.
5. ASSET-006..008: responsive delivery, accessibility and measured before/after
   payload/layout evidence. No approval based solely on generator output.

This sequence does not unlock gates. G0, independent review and original-Mac
Odysseus preservation remain prerequisites where specified by the backlog.
