# TrainPaceLab — UI/UX Audit & Phased Redesign Plan

> Whole-app review grounded in the live codebase. Distinguishes **verified behavior** (read from source) from **recommendations**. No code was changed for this audit.

---

## Stage 1 — Capability & Feature Mapping Audit

### 1.1 Active Science / Math / Service Capabilities

Inventoried from `src/science/`, `src/math/`, `src/utils/physiology/`, and `src/services/`. Each row links the capability to where it currently surfaces (✓ surfaced, ~ partially / buried, ✗ backend-only by design).

| Capability | Source module | Current UI surface | Status |
|---|---|---|---|
| Banister TRIMP (HR-reserve, sex-banded) | `science/trimp.ts` | Session `session_trimp` → LoadFatigueChart, FitnessStats | ✓ |
| EWMA CTL/ATL/TSB (fitness/fatigue/form) | `science/load.ts`, `math/load.ts` | DashboardGreeting (Form), LoadFatigueChart, FitnessStats, HorizonStrip | ✓ |
| Coggan TSS / NP / IF (power & pace stress) | `science/coggan.ts` | Workout detail (avg_power), not named on dashboard | ~ |
| Jack Daniels VDOT + training paces | `science/vdot.ts`, `science/daniels.ts` | `/vdot` page, PhysiologyStrip tile, Physiology page | ✓ |
| Daniels + Karvonen HR zones | `science/zones.ts`, `math/zones.ts` | `/zones` page | ✓ |
| Multi-sport threshold pace (provenance-aware) | `science/thresholdPace.ts`, `utils/physiology/thresholdPaceEngine.ts` | PhysiologyStrip tile (with provenance sub-label), Physiology page | ✓ |
| ACWR injury risk | `science/injury.ts`, `lib/injuryEngine.ts` | PhysiologyStrip "Injury risk" tile | ✓ |
| Race-time prediction + confidence bands | `science/racePrediction.ts` | `/predict` page | ✓ |
| Race split / pacing strategy (GAP + heat + glycogen) | `science/racePacing.ts` | RaceStrategyPlanner component, `/plan` | ✓ |
| Norwegian threshold intervals | `science/norwegianEngine.ts` | NorwegianIntervalPlanner component (buried in labs/tools) | ~ |
| Minetti grade-adjusted pace (GAP) | `science/minetti.ts`, `science/grade.ts` | Race pacing, workout detail | ~ |
| Heat / humidity / altitude / wind stress | `science/environment.ts`, `science/weatherStress.ts` | `/weather` page | ✓ |
| Aerobic Efficiency Factor + decoupling (Pa:HR) | `science/aerobic.ts` | Workout detail modal, not on dashboard | ~ |
| Stream reconciliation (multi-file FIT/TCX/CSV) | `science/streamReconciler.ts`, `science/reconciliation.ts` | Backend-only (intentional) | ✗ |
| Provider-agnostic holistic readiness | `science/readiness.ts`, `utils/recoveryEngine.ts` | ReadinessScoreCard, `/recovery` page | ✓ |
| Adaptive re-planning engine | `science/adaptiveEngine.ts` | AutoReplanOnDeviation backend function, AutoReplanPreviewCard | ~ |
| Novice baseline scaling | `science/noviceBaseline.ts` | Plan generation (backend) | ✗ |
| Telemetry adapters (Garmin/Strava/COROS/OCR) | `services/telemetry/`, `functions/*Sync` | Settings Connected Apps, Imports page | ✓ |
| Workout matching engine (planned↔actual) | `services/workoutMatchingEngine.ts` | PlannedActualReconciliation | ✓ |
| Workout export (.fit structured) | `services/workoutExport.ts` | Plan page export action | ✓ |

**Finding:** Three capabilities are computed but under-surfaced — **Coggan TSS**, **aerobic decoupling**, and **Norwegian intervals**. These are not missing UI (the components exist) but are buried behind tools/labs dropdowns or workout-detail modals, making them hard to discover from the primary dashboard.

### 1.2 Route & Navigation Inventory

Verified from `src/App.jsx` and `src/components/layout/navItems.js`.

**Primary nav (header bar, 4 items):** Dashboard `/app` · Analytics `/analytics` · Plan `/plan` · Coach `/coach`

**Tools dropdown (10 routes, 3 groups):**
- Calculators: VDOT `/vdot` · Weather `/weather` · Zones `/zones`
- Insights: Workouts `/workouts` · Race Predictor `/predict` · Race Ledger `/pbs` · Calendar `/calendar` · Training Board `/kanban`
- Labs: Physiology `/physiology` · Recovery `/recovery`

**Header actions:** Import `/import` · Upgrade `/subscribe` · Guide `/guide` · Account menu → Settings `/settings`
**Conditional:** Roster `/roster` (coach mode) · Admin `/admin` (admin role)
**Mobile:** Bottom tab bar mirrors the 4 primary items; hamburger sheet exposes all 10 tools + lens toggle + deep-metrics toggle + actions.

### 1.3 Dashboard Structure (Home.jsx)

Six numbered sections + an advanced accordion, verified from source:

| # | Section | Components | Disclosure |
|---|---|---|---|
| — | Greeting | DashboardGreeting (date, name, Form context, Fitness/Form mini-stats) | always |
| — | Alerts | AnomalyAlertBanner | always |
| 01 | Today's snapshot | PhysiologyStrip (4-tile grid), CalibrationMeter, TodaySessionCard | always |
| 02 | Load & Form | LoadFatigueChart, HorizonStrip | collapsible (deep) |
| 03 | Recent activity | CoachBriefing, OcrDropzone, RecentWorkouts | always |
| 04 | Planned vs. Actual | PlannedActualReconciliation | collapsible (deep) |
| 05 | Coach notes | CoachAdvice, CoachMessageFeed | collapsible (deep) |
| 06 | Recovery & Readiness | AISynthesisCard, ReadinessScoreCard, SleepEnergyCard, AutonomicStressCard, RecoveryLab, HolisticFactorsLog | collapsible (deep) |
| — | Advanced metrics | DashboardRangeControls, FitnessStats, BaselineHistoryMatrix, WeeklySummary, DataCommandCenter | accordion (scientific mode only) |

### 1.4 Settings Page Structure (AthleteSettings.jsx)

Single vertical scroll of 5 cards: Profile (form) → Coach mode → Connected Apps (Garmin/Strava/COROS) → More wearables (Oura/Whoop/Withings/Polar/Fitbit/Suunto) → Danger zone. No sub-navigation or anchor links.

### 1.5 Identified Hierarchy & Clarity Problems

1. **Flat dashboard hierarchy.** Sections 01–06 sit at the same visual weight, but 04/05/06 are collapsed by default. A new user sees 01–03 then a wall of collapsed bars — the "what matters most" signal is weak.
2. **Overlapping coach surfaces.** CoachBriefing (section 03), CoachAdvice (section 05), and the dedicated `/coach` page all deliver coaching insight. The split is not obvious to the user.
3. **Recovery is a collapsed afterthought on the dashboard** but has its own dedicated `/recovery` Lab page. The dashboard's 06 section and the Recovery Center page duplicate the same recovery widgets without a clear "summary here, detail there" relationship.
4. **Settings is a long undifferentiated scroll.** Connected Apps and More Wearables are split into two cards with an arbitrary boundary (automatic-sync vs OAuth-recovery) that the user does not think in.
5. **10 routes buried in a Tools dropdown.** Workouts, Calendar, Physiology, and Recovery are core workflows for an endurance athlete, not "tools." The Calculators/Insights/Labs grouping is an internal mental model, not the athlete's.
6. **Scientific/Simplified lens + deep-metrics toggle are redundant controls.** The lens already governs deep-section disclosure; a separate "Scientific mode" checkbox in the same menu doubles the cognitive load for the same outcome.
7. **PhysiologyStrip uses light-mode badge classes** (`border-emerald-200 bg-emerald-50 text-emerald-700`) inside a dark obsidian dashboard — a visual inconsistency visible in the screenshot.
8. **No global "where am I" breadcrumb** beyond the active pill in the header. On deep pages (Analytics, Physiology) the user has no contextual anchor.

---

## Stage 2 — Competitive Research & Design System Synthesis

### 2.1 Competitive patterns (COROS Training Hub, Intervals.icu, TrainingPeaks)

Researched via COROS support docs and known platform conventions:

| Pattern | COROS Training Hub | Intervals.icu | TrainingPeaks | Applicable to TPL |
|---|---|---|---|---|
| Primary surface | Customizable widget dashboard | Activities list + fitness chart | Performance Manager Chart (PMC) | TPL already centers Load & Form — lean into this |
| Metric legibility | Sans-serif labels, large numeric values | Dense monospace tabular metrics | Mixed | Adopt monospace for all tabular telemetry (already tokenized, under-applied) |
| Intensity encoding | Color-coded zones on calendar | Zone-tinted bars on charts | Zone-colored workout blocks | TPL has zone-1..5 tokens — apply to workout lists, charts, calendar |
| Information grouping | Dashboard / Calendar / Personal Info | Activities / Fitness / Calendar / Settings | Dashboard / Calendar / Workouts / Settings | Consolidate TPL nav into 3-4 clear groups |
| Explanatory language | Minimal | Tooltips on technical terms | Inline coaching text | TPL already has `Term` + `AuditBadge` — expand usage |
| Discovery | Recent workouts front and center | Activities table is the homepage | Today's planned workout is the hero | TPL's "Today's snapshot" is the right hero — strengthen it |

### 2.2 Design system recommendations (token-level)

The obsidian token tier already exists in `src/index.css` and `tailwind.config.js`. The audit found it is **defined but inconsistently applied**. Recommended consolidation:

**Surface tier (already tokenized, enforce usage):**
- Canvas: `--background` `#0B0D0E` → `bg-background`
- Elevated surface: `--card` `#121518` → `bg-card`
- Border: `--border` `#1E2328` → `border-border`
- Hover state: add `--surface-hover` token → `bg-accent` (currently `221 50% 16%`, adequate)

**Zone colors (already tokenized, under-applied):**
- `zone-1` (recovery) through `zone-5` (sprint) exist in both light and dark. Apply to: workout list badges, calendar day tinting, chart series, HR-zone breakdown bars. Currently only used in `ZoneBadge` and `HRZoneBreakdown`.

**Typography (already mapped, enforce):**
- `font-mono` (JetBrains Mono) is mapped in Tailwind but only used in `SectionHeading` index numbers and a few tile values. Apply to **all** numeric telemetry: CTL/ATL/TSB, pace, HR, distance, duration, VO₂max, ACWR. Use `tabular-nums` alongside for alignment.
- `font-heading` (Inter) for section titles and page H1.
- `font-body` (Inter) for descriptions and labels.

**Radius:** `--radius` is `0.375rem` (6px). Cards use `rounded-md` (inherits radius). Keep consistent — do not mix `rounded-lg` and `rounded-md` on the same surface tier.

**Action needed:** No new tokens required. The fix is **enforcement** — replace ad-hoc light-mode classes (e.g. `bg-emerald-50`, `text-rose-600` in PhysiologyStrip) with dark-surface-appropriate zone tokens or semantic classes.

---

## Stage 3 — Phased Redesign Plan

Each phase is scoped to be independently shippable. Phases are ordered by impact-to-effort ratio, prioritizing clearer hierarchy (the user's stated preference).

### Phase 1 — Dashboard hierarchy & visual consistency (highest impact)

**Goal:** Make the dashboard scannable in 3 seconds — today's state, today's session, trajectory.

**Scope:**
- **Promote "Today's snapshot" (01) to a distinct hero zone** with stronger surface elevation and the 4-tile PhysiologyStrip as its anchor. Add a one-line "what to do today" summary derived from readiness + TSB + planned session.
- **Merge sections 05 (Coach notes) and 03's CoachBriefing** into a single "Today's coaching" card directly under the hero. Move the full CoachMessageFeed to the `/coach` page (its dedicated home). Dashboard keeps a 2-line summary + "Open coach" link.
- **Demote section 06 (Recovery & Readiness)** to a compact 3-tile summary (Readiness, Sleep, HRV) with a "Open recovery center" link. The full 6-widget layout already lives on `/recovery`; the dashboard does not need to duplicate it.
- **Remove section 04 (Planned vs. Actual)** from the dashboard. It belongs on `/plan` and `/analytics` where the user is already in a planning/analysis mindset.
- **Fix PhysiologyStrip badge classes** — replace light-mode `bg-emerald-50 text-emerald-700` etc. with dark-surface zone tokens or muted-foreground + colored dot.
- **Enforce `font-mono tabular-nums`** on all numeric values in PhysiologyStrip, DashboardGreeting, LoadStatusCards, FitnessStats.

**Files touched:** `src/pages/Home.jsx`, `src/components/dashboard/PhysiologyStrip.jsx`, `src/components/dashboard/DashboardGreeting.jsx`, `src/components/dashboard/ReadinessScoreCard.jsx` (summary variant).

**Verification:**
- Dashboard renders without errors at tablet (1007px) and mobile (375px) widths.
- "Today's snapshot" is the first visible section; coaching and recovery are single-card summaries with links out.
- No light-mode badge classes remain in dark-surface components (grep for `bg-emerald-50`, `bg-amber-50`, `bg-rose-50`, `text-emerald-700` in `src/components/dashboard/`).
- `npm run build` passes with zero errors.

### Phase 2 — Navigation restructure (clarity & discoverability)

**Goal:** Replace the 10-route Tools dropdown with a navigation model that reflects how an athlete thinks: Train / Track / Analyze / Connect.

**Scope:**
- **Regroup navigation into 4 clear zones:**
  1. **Train:** Dashboard, Plan, Coach
  2. **Track:** Workouts, Calendar, Imports
  3. **Analyze:** Analytics, Recovery, Race Predictor, Race Ledger
  4. **Tools:** VDOT, Weather, Zones, Physiology Lab, Training Board
- **Promote Workouts and Calendar** out of the dropdown into the primary nav row (they are core tracking surfaces, not "insights").
- **Eliminate the redundant "Scientific mode" checkbox** from the Tools dropdown and mobile sheet. The Scientific/Simplified lens toggle already controls progressive disclosure; a second toggle for the same outcome is confusing.
- **Add a lightweight page-context line** (route group name) above the page H1 on deep pages so the user always knows which zone they are in.

**Files touched:** `src/components/layout/navItems.js`, `src/components/layout/AppLayout.jsx`, `src/components/layout/ToolsDropdown.jsx`, `src/components/layout/MobileNav.jsx`, `src/components/layout/MobileTabBar.jsx`.

**Verification:**
- All existing routes remain reachable (no route removed, only regrouped).
- Mobile bottom tab bar updated to reflect the new primary grouping (max 5 items).
- `npm run build` passes.

### Phase 3 — Settings restructure (Connected Apps unification)

**Goal:** Make Settings navigable and unify all wearable connections into a single coherent surface.

**Scope:**
- **Add anchor sub-navigation to Settings** (Profile · Connections · Coach · Data) so the user can jump to a section instead of scrolling.
- **Merge "Connected Apps" and "More wearables"** into a single "Connections" surface. Group by capability (Automatic workout sync: Garmin/Strava/COROS · Recovery-only OAuth: Oura/Whoop/Withings/Polar/Fitbit/Suunto · Coming soon: Apple Health) rather than by arbitrary card boundaries.
- **Adopt the 2×2 grid layout from the user's screenshot reference** for the primary connection cards (COROS, Garmin, Strava, Apple Health) — each card shows status, capabilities, steps, and manual fallback in a consistent structure.
- **Move the "Step-by-step export guides" HelpLink** to the bottom of the Connections section as a "Manual fallback guides" accordion.

**Files touched:** `src/pages/AthleteSettings.jsx`, `src/components/settings/DataConnectionsSettings.jsx` (new or refactored), `src/components/settings/CorosIntegration.jsx`, `GarminIntegration.jsx`, `StravaIntegration.jsx`, `WearableIntegrations.jsx`.

**Verification:**
- Settings page renders with sub-nav anchors that scroll to sections.
- All 9 wearable integrations (3 automatic + 6 recovery) appear under one "Connections" section.
- Connection status, sync, and disconnect actions still work (no business logic changed).
- `npm run build` passes.

### Phase 4 — Telemetry density & zone encoding (analytical surfaces)

**Goal:** Bring the analytical pages (Analytics, Physiology, Workouts, Calendar) up to the information density and zone-encoding standard of Intervals.icu / TrainingPeaks.

**Scope:**
- **Workouts page:** Convert the workout list to a dense table with monospace columns (date, sport, distance, duration, avg HR, load, zone tint). Add a zone-colored bar per row.
- **Calendar page:** Tint each day cell by dominant zone. Show load (TRIMP) as a bar under the date.
- **Analytics page:** Ensure all chart series use the zone-1..5 color tokens consistently. Add legend-based series identification (already a user preference) on every chart.
- **Physiology Lab page:** Surface the currently-buried Coggan TSS and aerobic decoupling metrics as named panels, not just workout-modal details.
- **Apply `font-mono tabular-nums`** to every numeric cell across these pages.

**Files touched:** `src/pages/Workouts.jsx`, `src/pages/Calendar.jsx`, `src/pages/AdvancedAnalytics.jsx`, `src/pages/Physiology.jsx`, `src/components/dashboard/PhysiologyLab.jsx`, `src/components/dashboard/TrainingMetricsCard.jsx`, chart components in `src/components/analytics/`.

**Verification:**
- `npm run build` passes.
- Zone colors are applied to workout list, calendar, and chart series.
- All numeric telemetry uses monospace + tabular-nums (grep for `font-mono` coverage in analytical components).
- Existing test suites still pass (run `npm test` and report actual results — do not assume a count).

### Phase 5 — Polish & regression gate

**Goal:** Final consistency pass and full verification.

**Scope:**
- Audit all remaining components for light-mode class leakage (`bg-white`, `bg-emerald-50`, `text-rose-600`, etc. on dark surfaces).
- Verify 44px minimum touch targets on all mobile interactive elements (already a preference — enforce in any new component).
- Verify all charts use legend-based series identification.
- Run full build + test suite and report actual results.

**Verification:**
- `npm run build` — zero errors.
- `npm test` — report actual pass/fail count (do not promise a specific number without running).
- Grep audit: no light-mode classes on dark-surface components.
- Mobile sweep at 375px: no element below 44px touch target.
- Tablet sweep at 1007px: no horizontal overflow.

---

## Scope Boundaries

- **No business logic changes.** All backend functions, science engines, RLS rules, and data flows remain untouched. This is a presentation-layer audit and plan.
- **No routes removed.** Every current route stays reachable; navigation is regrouped, not pruned.
- **No new dependencies.** The design system is already tokenized; this plan enforces existing tokens, it does not add libraries.
- **No feature additions.** Under-surfaced capabilities (Coggan TSS, aerobic decoupling, Norwegian intervals) are surfaced from existing components, not newly built.

## Verification Criteria (applies to every phase)

1. `npm run build` completes with zero Vite compilation errors.
2. `npm test` is run and the actual result is reported (pass count / fail count) — no pre-claimed "100% pass" without evidence.
3. Affected routes render at tablet (1007px) and mobile (375px) without horizontal overflow or broken layout.
4. No light-mode class leakage on dark obsidian surfaces.
5. All mobile interactive elements ≥ 44px touch target.
6. All numeric telemetry uses `font-mono tabular-nums`.