# TrainPaceLab marketing and asset delivery

## Brand platform
- **Positioning:** Endurance training intelligence with transparent models and visible data-quality limits.
- **Headline:** Train with context. Not guesswork.
- **Short description:** Bring your training, recovery signals and structured endurance planning together. Understand what your data supports and where it is incomplete.
- **Audience:** Runners, cyclists, triathletes and endurance coaches who value explainable numbers.
- **Voice:** Measured, specific, evidence-led. No guaranteed injury prevention, fitness gains or provider-sync promises.

## Deliverables in this branch
- `public/assets/trainpacelab-social.svg`: original editable 1200×630 social artwork using graphite, muted slate and lime; no unlicensed photography or fabricated athlete metrics.
- `index.html`: search description, canonical URL, Open Graph and Twitter metadata. **Temporary image:** existing PNG logo for maximum social crawler compatibility. The SVG card is a design source, not yet the production OG image.
- `src/pages/Landing.jsx`: hero and product messaging revised to avoid unverifiable physiological outcomes.

## Publishing checklist and blockers
- Export social SVG to 1200×630 PNG or JPEG and commit to `public/assets/`; then update `og:image` and `twitter:image` to the exported file. Do not assume social scrapers support SVG.
- Validate current original logo PNG rights and dimensions; do not replace it without reviewing ownership/master artwork. Verify SVG favicon at 16/32px and manifest icon at 192/512px; produce proper PNGs if needed.
- Audit existing Unsplash photo IDs, image subjects, commercial use/license terms and alt text; keep a license register. Do not call a generated image a real photograph.
- Obtain permission and anonymize any real dashboard screenshots before publishing marketing examples. Label sample data explicitly.
- Run `npm run lint`, `npm test`, `npm run build`, inspect 390px mobile and desktop, check social preview and image fetchability, and verify Base44/Vercel release identity.
- Check every pricing, provider availability and feature claim against production before launch. No paid ads or tracking pixels are introduced by this change.

## Copy pack
**Social post:** Training numbers should come with context. TrainPaceLab brings endurance sessions, recovery signals and structured planning together, with transparent calculations and clear limits when data is missing. Explore TrainPaceLab.

**One-line pitch:** A clearer view of training load, recovery and the plan ahead.

**Short tagline:** Understand the work. Plan the next session.

## Existing photography
The landing page currently references external Unsplash URLs. They are not included in this PR as owned assets, and their individual license/subject suitability is not verified here. Do not treat them as a completed licensed asset library.

## Separation of responsibilities (approved working structure)
**Brand assets (this package):** canonical logo source and lockups, favicon exports, brand colours, typography guidance, photography usage rights, social artwork, and reusable copy. Never depict backend PR status or engineering backlog in advertising artwork.

**Public website frontend (separate delivery):** landing layout, responsive image crops, navigation, CTA routes, accessibility, pricing presentation, and SEO rendering. It consumes brand assets but is not itself an asset library.

**Authenticated product frontend (separate delivery):** athlete dashboard, charts, calendar, device-state UI, empty/error states, and real anonymized screenshots for marketing. Do not substitute generated dashboard mockups.

**Backend and science (separate delivery):** ingestion, authentication, training calculations, recovery models, planning, and release infrastructure. Marketing may describe these only after verifying live functionality.

## Canonical visual rules
- Existing repository favicon artwork `public/assets/trainpacelab-icon.svg` is the current canonical icon reference. Do not silently substitute a mountain-shaped or generic pulse icon from a concept board.
- Palette: graphite `#0B0D0E`, slate `#53646B`, lime `#D4F36B`, off-white `#F3F6F3`. Apply lime sparingly to actions and focal details.
- Typography: use the project's existing heading/body font configuration first; Inter is a *concept reference*, not a new bundled font or required license.
- Visuals: real, rights-cleared tracks, roads, trails, cycling and pools. Prefer scenery over posed athletes. Do not call generated references real photography.
- Never fabricate a dashboard screenshot, metric, testimonial, athlete endorsement, device partnership or scientific outcome.
- A brand concept board is for visual approval only. It must not be added to the live website or treated as an approved logo or licensed asset.

## Deliverable ownership and acceptance
| Stream | Acceptance evidence | Status |
| --- | --- | --- |
| Brand identity | Master logo ownership, tested variants, consistent palette | In progress |
| Social assets | 1200×630 raster, accessible at production URL, social preview verified | SVG concept only |
| Photography | Rights register with image source, license and permitted use | Pending |
| Public website | 390px + desktop screenshots, CTA/SEO/accessibility checks | Pending |
| Product screenshots | Actual app capture, permission, anonymization and sample-data labels | Pending |
| Backend/science | Separate feature tests and release review, not marketing deliverables | Outside scope |
