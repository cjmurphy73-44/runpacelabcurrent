# Removed Obsolete Code — 2026-08-26

Audit record of obsolete code removed during pre-beta cleanup. Files are gone from
the repo; this manifest is the recovery cross-reference (use Git history to restore any
file). It holds no file contents.

## A. Next.js app-router tree (orphaned framework leftovers)

The live app is Vite + React (`src/main.jsx` → `src/App.jsx`). `next` was never installed,
so none of these were reachable from the live graph — an incompatible framework remnant
from an earlier architecture.

- `src/app/page.tsx` — Next.js home page (next/link); superseded by `src/pages/Home.jsx`
- `src/app/layout.tsx` — Next.js root layout + metadata; superseded by AppLayout + index.html
- `src/app/vdot/page.tsx` — duplicate of `/vdot` route
- `src/app/settings/page.tsx` — duplicate of `/settings` route
- `src/app/training-plan/page.tsx` — duplicate of `/plan` route
- `src/app/ai-coach/page.tsx` — duplicate of `/coach` route
- `src/app/pbs/page.tsx` — duplicate of `/pbs` route
- `src/app/zones/page.tsx` — duplicate of `/zones` route
- `src/app/weather-adjust/page.tsx` — duplicate of `/weather` route
- `src/app/api/ai-coach/route.ts` — Next.js route handler; logic lives in `early_version_ai_coach` agent
- `src/app/api/pbs/route.ts` — Next.js route handler; logic lives in `src/lib/personalBests.js`
- `src/app/api/vdot/route.ts` — Next.js route handler; logic lives in `src/math/vdot.ts`
- `src/app/api/vdot/vdot-api.test.ts` — test of the deleted route handler
- `src/app/api/weather-adjust/route.ts` — Next.js route handler; logic lives in `src/math/environmental.ts`
- `src/app/api/weather-adjust/weather-adjust-api.test.ts` — test of the deleted route handler
- `src/app/api/zones/route.ts` — Next.js route handler; logic lives in `src/math/zones.ts`
- `src/app/api/zones/zones-api.test.ts` — test of the deleted route handler

## B. Prisma layer (parallel data layer; Base44 uses `base44.entities.*`, never Prisma)

- `prisma/schema.prisma` — Prisma schema; Base44 entities replace these models
- `prisma.config.ts` — Prisma CLI config
- `src/lib/prisma.ts` — PrismaClient singleton; unused by live code
- `src/lib/db.ts` — duplicate PrismaClient singleton; unused by live code
- `src/services/userService.ts` — orphan service, sole consumer of `db` / `@prisma/client`; nothing imported it (live users come from `base44.entities.User` / invites). Removed so `@prisma/client` could be stripped cleanly.

## C. Duplicate / stub components (live replacements exist)

- `src/components/Navigation.tsx` — Next.js nav (next/link, next/navigation); live shell is `src/components/layout/AppLayout.jsx`
- `src/components/AICoachWidget.tsx` — fetched the deleted `@/api/ai-coach` route; live coach is the `early_version_ai_coach` agent via `src/pages/CoachChat.jsx`
- `src/components/BulkWorkoutImport.jsx` — `setTimeout` mock stub that mis-passed props to the deleted modal. The real importer is `src/components/dashboard/BulkWorkoutImport.jsx` (used by `src/pages/Imports.jsx`), which calls the `bulkIngestWorkouts` backend function.
- `src/components/WorkoutReconciliationModal.tsx` — stub reconciliation modal; only consumer was the deleted top-level BulkWorkoutImport stub
- `src/lib/reconciliationEngine.ts` — trivial heuristic used only by the deleted stub modal above; live reconciliation is in `base44/shared/workoutIngest.ts`

## D. Scratch / mock files (self-referential orphan cluster)

- `test-webhook.ts` — manual scratch script importing the deleted WebhookHandler via a `.ts` path
- `src/data/mockActivities.js` — fixture data, not referenced by live code
- `src/lib/telemetry/WebhookHandler.ts` — Strava/Garmin normalizer. The live `webhookWearableSync` backend function does NOT import it (confirmed via scan of `base44/`); only the orphans below referenced it.
- `src/lib/telemetry/__tests__/WebhookHandler.test.ts` — test of the deleted handler
- `src/api/webhooks.ts` — orphan client wrapper, the sole importer of WebhookHandler; not in the live graph (no file imports it). Removed alongside the handler to avoid leaving a broken-import.
- `src/api/webhooks.test.ts` — orphan test of the deleted `webhooks.ts`
- `src/constants/colors.ts` — duplicate of `src/constants/colors.js` (identical `THEME_COLORS`). Vite resolves `.js` before `.ts`, so the live `@/constants/colors` import always used `colors.js`; the `.ts` copy was dead. `colors.js` is retained.

## npm packages stripped

- `prisma` — only consumed by the removed Prisma layer (schema/CLI)
- `@prisma/client` — only imported by the removed `prisma.ts`, `db.ts`, `userService.ts`

## Exempt (flagged but kept)

- `next-themes` — still imported by `src/components/ui/sonner.jsx`, so not orphaned; left in place.
- `src/constants/colors.js` — retained (resolution target of `@/constants/colors`).