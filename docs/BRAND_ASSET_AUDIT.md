# TrainPaceLab brand and imagery audit — 2026-11-12

## Existing verified assets
- Only one file is present under public/assets: `logo-300x300.png`.
- The web app manifest references the same externally hosted logo URL for both 192px and 512px icon declarations. Actual native dimensions, favicon rendering, maskable safe area and offline icon availability are **not verified**.
- The current landing page's illustrations and photography must be audited against rights and source; do not claim generated scenery is real photography.

## Implementation backlog
1. Confirm original logo ownership and master vector; export properly sized 192, 512, maskable, favicon and Apple touch variants. Validate image dimensions and contrast before updating the manifest.
2. Acquire licensed or owner-provided **real** road, track, trail, pool and cycling photographs; retain attribution/license metadata. Do not use AI-generated people or present AI scenes as photographs.
3. Build a consistent hero and Open Graph card from licensed scenery plus actual, anonymized UI screenshots. Clearly label example metrics and previews.
4. Optimize responsive WebP/AVIF variants, meaningful alt text, lazy loading below the fold and mobile crop. Test Lighthouse and 390px layout.
5. Publish only after confirming production source version, deploy identity and authenticated visual acceptance.

## Mathematics guardrail
- Pure calculation functions, regression tests and explicit missing-data semantics take priority over persuasive AI text.
- A zero result from the current rTSS/hrTSS API can mean **invalid input**; downstream UX must not treat it as a verified zero-load workout. Future API improvement: return a typed missing/invalid reason without breaking consumers.
