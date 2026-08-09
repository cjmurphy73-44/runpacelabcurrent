# Runpacelab — Product Roadmap

_Endurance intelligence platform — adaptive, data-driven training built on physiological modeling, AI coaching, and wearable ingestion._

## Phase 1 — Foundation (Shipped)
- Core athlete profile + physiology thresholds (HR zones, FTP, threshold pace, VDOT estimate).
- Workout ingestion pipeline (`.fit`/`.csv`) via shared `telemetryParser` + `workoutIngest` with strict sanitize + dedup guards.
- EWMA-based CTL/ATL/TSB engine (`recalculateCTLATLTSB`) with tier-adjusted time constants; results persisted to both `DailyMetrics` and `AthleteProfile`.
- Dashboard: "Pro-Athlete Obsidian" metric banner, Load & Fatigue forecast chart, training calendar, recent workouts, coach message feed.
- AI coach agent + backend functions: training-plan generation, micro-adjustments, post-workout evaluation, race strategy.
- COROS OAuth connection + webhook ingestion.
- Experimental safety pattern: `<WipWrapper>` + `ErrorBoundary` for non-breaking feature rollout.

## Phase 2 — Intelligence & Ingestion (In Progress)
- **Screenshot OCR import** — `parseWorkoutScreenshot` backend function (Core `InvokeLLM` vision pass with a strict `response_json_schema` and per-field confidence flagging) feeding `OcrVerificationModal`: a side-by-side image preview + editable pre-filled form, with `#F59E0B` amber borders on every low-confidence (`< 0.85`) field. Persists through the existing `bulkIngestWorkouts` pipeline + `recalculateCTLATLTSB` refresh.
- **Race Pacing Engine** — `racePacingEngine.ts` pure utility: Minetti grade-adjusted pace (GAP) with a −12% downhill eccentric-braking clamp, Heat Score (Air Temp °F + Dew Point °F) pace penalties across four bands, and 15% start-distance glycogen throttling (start → steady → finish split phases). Mounted on the dashboard inside `<WipWrapper isWip featureName="Race Strategy Engine">`.
- **Recovery data consolidation** — recovery CSV drops and the daily biometric log now UPSERT into `DailyMetrics` (HRV + sleep score), never clobbering computed CTL/ATL/TSB; aerobic baseline tests write to `AthleteProfile` thresholds (`vdot_estimate`, `ftp_watts`, `lactate_threshold_hr`, `resting_hr`).

## Phase 3 — Live Integrations & Polish (Planned)
- Smart Sync Manager — unify Garmin Health / Strava / Wahoo webhook ingestion behind one normalized `TelemetryParser` service.
- Metric visualization overhaul — zone shading (Z1–Z5), crosshair-synced charts, richer CTL/ATL/TSB correlation views.
- Mobile field/track view — one-handed layout, large tap targets, offline-friendly session cards.
- Payment/billing for premium coaching tiers.