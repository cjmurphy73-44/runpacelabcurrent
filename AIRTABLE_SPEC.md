# TrainPaceLab — Data & Business Spec for Airtable

This document is a ready-to-paste reference describing TrainPaceLab's data model, business logic, and a
suggested Airtable base layout. Use it to stand up an Airtable base that mirrors the app's operational data
(subscribers, athletes, plans, workout summaries) for reporting and business ops.

---

## 1. Product overview

TrainPaceLab is an adaptive athletic training-intelligence platform. Athletes connect wearables (Garmin, Strava,
COROS) or upload FIT/TCX/CSV files; the app reconciles those into unified workout sessions, models training
load (TRIMP / CTL / ATL / TSB) and recovery, and generates adaptive training plans and AI-coach insights.
Coaches on the Team plan manage a roster of athletes with side-by-side comparison and plan assignment.

## 2. Pricing & plans

| Plan | Price | Cadence | Key entitlements |
|---|---|---|---|
| Free | A$0 | forever | Dashboard, physiology lab, 30-day wearable lookback, 5 AI-coach msgs/week |
| Pro | A$19 | per month | Unlimited sync history, adaptive re-planning, structured .fit export, unlimited AI coach |
| Team | A$49 | per month | Everything in Pro + multi-athlete coach roster, comparison, plan assignment, priority support |

Subscriptions are provisioned by Stripe (Pro = `prod_VAQcGqqEQFKhXh`, Team = `prod_VAQch6BqM0xP8K`) and tracked
in the `Subscription` entity. MRR = sum over active+trialing subscriptions of the plan price.

## 3. User roles

- **admin** — workspace owner; can list/update/delete users, see all data, access the Business dashboard.
- **coach** — an athlete who also coaches; gains the Roster and coach tools. Requires Team plan.
- **athlete** (default) — uses the app for their own training.

## 4. Entity data dictionary

Each record has built-ins: `id`, `created_date`, `updated_date`, `created_by_id`.

### AthleteProfile
| Field | Type | Notes |
|---|---|---|
| first_name / last_name | string | required |
| country | string | |
| height_cm / weight_kg / age | number | |
| sex | enum | male / female / other (TRIMP weighting) |
| training_tier_preference | enum | conservative / moderate / aggressive (loads EWMA time constants) |
| profile_role | enum | athlete / coach |
| max_heart_rate / resting_hr / lactate_threshold_hr | integer | HR model inputs |
| ftp_watts | integer | cycling threshold power |
| functional_threshold_pace_ms | number | running threshold pace (m/s) for rTSS |
| vdot_estimate | number | Jack Daniels VDOT equivalent |
| ctl_time_constant_days / atl_time_constant_days | integer | EWMA tau (default 42 / 7) |
| current_ctl / current_atl / current_tsb | number | live Fitness / Fatigue / Form |
| injury_history | string | freeform; shapes prehab + load caps |
| webhook_api_key | string | per-athlete webhook auth |

### WorkoutSession
| Field | Type | Notes |
|---|---|---|
| athlete_id | string → AthleteProfile | |
| date | date | |
| sport | enum | running / cycling / swimming / strength / triathlon / other |
| duration_minutes / duration_seconds | number | |
| distance_km | number | |
| avg_hr / max_hr | integer | |
| avg_power / avg_cadence | number | |
| source_format | enum | fit / tcx / csv / webhook |
| session_trimp | number | Banister HR-based TRIMP |
| session_tss | number | rTSS fallback (NGP-based) |
| efficiency_factor | number | NGP (or power) ÷ avg HR |
| aerobic_decoupling | number | Pa:HR % for long aerobic runs |
| streams / laps | array | reconciled master telemetry + lap segments |
| training_plan_session_id | string → TrainingPlanSession | if matched to a prescription |
| post_workout_feedback_id | string → WorkoutFeedback | |

### DailyMetrics
| Field | Type | Notes |
|---|---|---|
| athlete_id | string → AthleteProfile | |
| date | date | |
| total_trimp | number | daily stress sum |
| calculated_ctl / calculated_atl / calculated_tsb | number | end-of-day load |
| sleep_score / hrv_score / hrv / resting_hr / readiness_score | number/int | recovery inputs |
| holistic_factors | object | nutrition, soreness, travel/jet-lag |

### TrainingPlan / TrainingPlanSession
TrainingPlan holds the macrocycle, weekly prescriptions, pace zones, prehab, nutrition, and HRV framework for one
athlete. TrainingPlanSession is one prescribed day (sport, duration, intensity zone, target HR/power/pace,
structured steps, status: pending/completed/partial/excess/skipped/modified).

### WorkoutFeedback
AI post-workout insight: `feedback` text, `status`, `intensity` (easy/moderate/hard/very_hard), `highlights[]`.

### Subscription
| Field | Type | Notes |
|---|---|---|
| user_id | string → User | |
| plan | enum | free / pro / team |
| status | enum | active / trialing / past_due / canceled |
| stripe_customer_id / stripe_subscription_id | string | |
| current_period_end | date-time | |

### CoachAthleteAssignment
Links a coach User to an AthleteProfile in their roster: `coach_user_id`, `athlete_profile_id`,
`athlete_name_snapshot`, `status` (active/archived), `notes`.

### Connections & webhooks
`StravaConnection`, `GarminConnection`, `CorosConnection` store per-athlete OAuth tokens + sync status.
`WebhookEvent` is an idempotency log keyed by `event_id` (provider + object) to dedupe retries.

## 5. Key business logic

- **Training load (Banister TRIMP):** `TRIMP = duration_min × ΔHR_ratio × sexWeight`, where ΔHR_ratio =
  (avgHR − restHR) / (maxHR − restHR), sexWeight = 0.86 (male) / 1.72 (female).
- **CTL / ATL / TSB (EWMA):** Fitness = EWMA of daily TRIMP over `ctl_time_constant_days` (default 42);
  Fatigue over `atl_time_constant_days` (default 7); Form = Fitness − Fatigue.
- **VDOT:** Jack Daniels equivalent from recent race/estimate; drives running pace zones and race predictions.
- **Adaptive re-planning:** when a completed session deviates >±5% from prescription, the engine flags it
  (partial/excess/skipped/modified) and re-sequences the plan per training-tier preference.
- **Injury-aware caps:** `injury_history` raises prehab frequency and softens load ramps.
- **Dedup:** inbound webhook events and historical syncs dedupe on `event_id` and fuzzy (date+sport+duration+distance).

## 6. Airtable base layout (in use)

The connected base is **"Telemetry & AI Coaching Business Tracker"**
(`appPJ0dEgcDt0dSNq`). It is a strategy/business base (not an operational mirror of individual
subscribers/workouts) — the Airtable connector scopes granted are
`data.records:read/write`, `schema.bases:read`, `user.email:read` only, so no tables or fields can
be created; `airtableSync` writes records into the existing 5 tables.

| Table | Airtable ID | Key field | Purpose in the sync |
|---|---|---|---|
| System Health Metrics | `tblbmAUsLIgZ1kt9Q` | `Metric Name` | One row per live KPI (Active Subscribers, Pro/Team counts, Registered Users, Athlete Profiles, Workout Sessions, MRR USD, Airtable Sync). `Current Status` holds the value; `Last Tested Date` stamps the sync row. |
| User Segments | `tblhdWaxBcAlAJuj9` | `Segment Name` | One row per plan segment — "Free / Community" (`Pricing Tier` = Free), "Pro Athlete" (Pro), "Coach / Team" (Coach/Team). `Projected ARPU` = plan revenue ÷ plan count; `Usage Tier` = `${count} users/subscribers`. |
| Finances & Unit Economics | `tbl98xAicV8mxRgo0` | `Expense or Revenue Category` | A single "MRR (Monthly Recurring Revenue)" row with `Cost Type` = Revenue and `Estimated Monthly Cost` = current MRR in USD. |
| Features | `tblcI8ifzkmNlNSYr` | — | Strategy/roadmap table; not written by the sync (manually curated). |
| Data Assets & Security Governance | `tblKq7SHe036DLwhh` | — | Governance table; not written by the sync (manually curated). |

`singleSelect` values written by the sync are constrained to the field's configured choices:
`Cost Type` ∈ {Fixed Monthly, Variable/Usage-Based per User, Revenue, Fixed Cost, Variable Cost, COGS};
`Pricing Tier` ∈ {Free, Pro, Coach/Team, …}. The sync only writes choices that already exist.

## 7. Sync implementation (app → Airtable)

The backend function **`airtableSync`** (`base44/functions/airtableSync/entry.ts`) is admin-only and pushes a
read-only business snapshot into the three writable tables above.

- **Action:** `POST` `{ action: "sync_business_snapshot" }` (invoke via `base44.functions.invoke("airtableSync", { action: "sync_business_snapshot" })`).
- **Source data:** `Subscription`, `AthleteProfile`, `User`, `WorkoutSession` entities, read as the service role
  (bypasses RLS). Each is listed up to 500 rows.
- **Computed metrics:**
  - `mrr` = Σ `PLAN_PRICE[plan]` over active+trialing subscriptions, where `PLAN_PRICE = { free: 0, pro: 19, team: 49 }` (USD/mo, from the Stripe products).
  - `plan_counts` = { free: users with no Subscription row, pro: active+trialing pro, team: active+trialing team }.
  - `arpuPro` / `arpuTeam` = plan revenue ÷ plan count (falls back to list price when there are no subscribers).
- **Upsert:** existing rows are matched on the table's key field (see table above) and updated in place; new
  metrics are created. Writes are batched ≤10 records per request and throttled (250 ms between calls) to stay
  under Airtable's 5-req/sec/base limit. Reads paginate with `pageSize=100`; `totalRecordCount` is not used.
- **Trigger:** manual, via the **Sync to Airtable** button on the Admin dashboard (`/admin`). A scheduled nightly
  workflow can be added later by wiring `invoke_backend_function` to a `scheduled` trigger (see
  `get_capability_guide("workflows")`).

The function returns `{ success, snapshot: { mrr_usd, plan_counts, users, athletes, workouts }, airtable: { system_health, finances, user_segments } }`.