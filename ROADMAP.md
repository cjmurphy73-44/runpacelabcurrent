# Runpacelab — Endurance App Excellence & Feature Roadmap

_Lead Product Architect Notes — targeting parity/superiority vs. Runna, TrainingPeaks, intervals.icu, and Final Surge._

## 1. UI/UX & Feel Upgrades
- **Design System:** "Pro-Athlete Obsidian" — dark-mode-default theme, high-contrast white/emerald text on deep charcoal/black, glassmorphism cards for stat panels.
- **Micro-interactions:** Subtle hover/press states, animated number counters for metrics (CTL/ATL/TSB), smooth tab/page transitions.
- **Charting:** Migrate legacy charts to interactive Recharts instances with zoom, crosshair sync, and zone shading (Z1–Z5).
- **Loading States:** Skeleton loaders across all data-fetching components to eliminate empty-state flicker.
- **Mobile-first:** Field/track view optimized for one-handed use, large tap targets, offline-friendly session cards.

## 2. Data Integrations & Import Channels
- **OAuth/Webhook Architecture:**
  - Garmin Health API — webhook push for activities, sleep, HRV.
  - Strava API — OAuth + webhook subscription for new activities.
  - Wahoo API — OAuth token exchange, activity pull.
  - Apple HealthKit — client-side export/import bridge (no direct server OAuth; requires companion export flow).
- **File Parser Pipeline:**
  - Centralize `.fit`, `.gpx`, `.tcx`, `.csv` parsing behind a shared `TelemetryParser` utility (extending `bulkIngestWorkouts` logic) so every ingestion path (webhook, upload, bulk import) uses the same normalization + dedup rules.
  - Screenshot OCR: use `InvokeLLM` with `file_urls` + a strict `response_json_schema` to extract workout summaries (duration, distance, HR, pace) from screenshots of other apps.

## 3. WIP / Feature Flag Architecture
- **Pattern:** `<WipBadge />` for lightweight visual tagging; `<WipWrapper isWip>` for wrapping full experimental components — combines an error boundary (isolates crashes from the stable app) with a blurred/semi-transparent "Coming Soon" preview overlay.
- **Safety principle:** Experimental features never touch core athlete data paths (profile, workout logs, training plan commit) directly — they read from existing data but cannot introduce new required state.

## 4. Next Immediate Action Plan (Top 3)
1. **Smart Sync Manager** — unify Garmin/Strava/Wahoo webhook ingestion + file upload behind one `TelemetryParser` service to reduce duplicate parsing logic and prepare for live vendor integrations.
2. **Metric Visualization Overhaul** — upgrade dashboard charts to the "Pro-Athlete Obsidian" visual system with zone shading and richer TSB/CTL/ATL correlation views.
3. **Experimental Lab Rollout** — apply `WipBadge`/`WipWrapper` to in-progress features (e.g., Race Pacing Strategy, OCR import) so they can ship to production safely without risking core workflows.