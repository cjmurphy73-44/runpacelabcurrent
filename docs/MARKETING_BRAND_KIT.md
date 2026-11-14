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
