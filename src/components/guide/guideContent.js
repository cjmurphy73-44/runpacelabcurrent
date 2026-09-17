// All copy for the User Guide lives here as plain data so the guide page stays
// layout-only and inline help links can jump to stable anchors.
// status: "live" (works now) | "beta" (works, may need setup) | "soon" (roadmap)

export const PROVIDERS = [
  {
    id: "coros",
    name: "COROS",
    status: "live",
    type: "auto",
    formats: "Workouts + recovery (HRV, sleep, resting HR, recovery score)",
    blurb: "One-click OAuth sync through the COROS open platform — workouts and daily recovery flow in automatically.",
    steps: [
      "Go to Settings → Connected Apps and tap Connect COROS.",
      "Authorise TrainPaceLab in the COROS window that opens.",
      "Tap Sync now (or wait for the scheduled pull) to import recent workouts and recovery.",
      "Recovery data writes to your Recovery Center automatically each day.",
    ],
    manual: "In the COROS app: open an activity → Share/Export → choose .FIT → save the file, then drop it into Bulk File Upload here.",
  },
  {
    id: "garmin",
    name: "Garmin",
    status: "live",
    type: "auto",
    formats: "Workouts + recovery (HRV, sleep, resting HR, Body Battery, stress, Training Readiness)",
    blurb: "OAuth connection plus incoming Garmin Health webhooks for automatic sync.",
    steps: [
      "Go to Settings → Connected Apps and tap Connect Garmin.",
      "Approve the data-sharing permissions on Garmin's consent screen.",
      "Tap Sync historical to backfill recent activities and recovery baselines.",
      "From then on, new activities and daily recovery push in automatically via webhook.",
    ],
    manual: "On connect.garmin.com: Activities → open an activity → ⋯ → Export Original (downloads a .FIT). Drop that file into Bulk File Upload.",
  },
  {
    id: "strava",
    name: "Strava",
    status: "live",
    type: "auto",
    formats: "Workouts (.FIT from the original upload)",
    blurb: "Automatic webhook sync, or manual export of the original file.",
    steps: [
      "On the Imports page open the Automated Webhooks tab and copy your personal webhook URL + key.",
      "In Strava: Settings → My Apps / API → point your webhook subscription at your TrainPaceLab endpoint (advanced).",
      "New activities will then push in automatically.",
      "Prefer manual? See the export steps below — no webhook needed.",
    ],
    manual: "On strava.com: open an activity → ⋯ → Export GPX. Strava also keeps the original .FIT — export it from the same menu when available, then drop it into Bulk File Upload.",
  },
  {
    id: "apple-health",
    name: "Apple Health (iPhone)",
    status: "soon",
    type: "bridge",
    formats: "Workouts + HRV + sleep + resting HR",
    blurb: "Coming soon via an on-device bridge. On-device Apple Health can't be read from the web yet.",
    steps: [
      "Not live yet — Apple Health requires an on-device bridge we're building.",
      "In the meantime, use a connected watch (COROS/Garmin) or export a workout file manually.",
      "When ready, you'll grant Health access once on your iPhone and data will sync here.",
    ],
    manual: "Today you can open the Workout/Health app, take a screenshot of a session, and use our OCR import (Imports → upload a screenshot).",
  },
  {
    id: "fitbit",
    name: "Fitbit",
    status: "soon",
    type: "bridge",
    formats: "HRV, sleep, resting HR, daily readiness",
    blurb: "Coming soon via a mobile-to-backend bridge (Fitbit's Google Health API is mobile-scoped).",
    steps: [
      "Not live yet — Fitbit data needs the on-device bridge (same project as Apple Health).",
      "Meanwhile, connect COROS or Garmin for automatic recovery, or log recovery manually in the Recovery Center.",
    ],
    manual: "Fitbit web dashboard lets you export a data archive (Settings → Data Export), but it isn't structured for direct upload yet.",
  },
  {
    id: "oura",
    name: "Oura Ring",
    status: "soon",
    type: "auto",
    formats: "HRV, sleep score, sleep duration, resting HR, readiness",
    blurb: "Free OAuth provider — wiring in now. Recovery will sync automatically once enabled.",
    steps: [
      "Will appear under Settings → More wearables once the Oura developer app is approved.",
      "You'll tap Connect Oura, authorise, and daily readiness/HRV/sleep flows in overnight.",
      "Meanwhile, log recovery manually in the Recovery Center or screenshot-import it.",
    ],
    manual: "Oura on the web: Settings → Data Export → download your data archive for manual reference.",
  },
  {
    id: "whoop",
    name: "Whoop",
    status: "soon",
    type: "auto",
    formats: "Recovery score, HRV, resting HR, sleep",
    blurb: "Free OAuth provider — wiring in now.",
    steps: [
      "Will appear under Settings → More wearables once the Whoop developer app is approved.",
      "Connect once and daily recovery/HRV/sleep syncs automatically.",
      "Meanwhile, log recovery manually or screenshot-import it.",
    ],
    manual: "Whoop app: More → Data Export → request a data export for manual reference.",
  },
  {
    id: "withings",
    name: "Withings",
    status: "soon",
    type: "auto",
    formats: "HRV, sleep, resting HR",
    blurb: "Free OAuth provider — wiring in now.",
    steps: [
      "Will appear under Settings → More wearables once the Withings developer app is approved.",
      "Connect once and daily metrics sync automatically.",
      "Meanwhile, log recovery manually or screenshot-import it.",
    ],
    manual: "Withings web: Settings → Data → export your data for manual reference.",
  },
  {
    id: "polar",
    name: "Polar",
    status: "soon",
    type: "auto",
    formats: "Nightly Recharge, sleep, HRV, resting HR",
    blurb: "Free OAuth provider (Polar AccessLink) — wiring in now.",
    steps: [
      "Will appear under Settings → More wearables once the Polar AccessLink client is approved.",
      "Connect once and nightly recovery syncs automatically.",
      "Meanwhile, log recovery manually or screenshot-import it.",
    ],
    manual: "Polar Flow web: Settings → Data Export → download for manual reference.",
  },
  {
    id: "suunto",
    name: "Suunto",
    status: "soon",
    type: "auto",
    formats: "Workouts + recovery (where available)",
    blurb: "Pending Suunto developer access — wiring in once granted.",
    steps: [
      "Will appear under Settings → More wearables once Suunto developer access is granted.",
      "Connect once and workouts/recovery sync automatically.",
      "Meanwhile, export .FIT files from Suunto and upload them manually.",
    ],
    manual: "Suunto app: open an activity → export/share → save the .FIT and drop it into Bulk File Upload.",
  },
  {
    id: "samsung",
    name: "Samsung Health",
    status: "soon",
    type: "bridge",
    formats: "HRV, sleep, resting HR, workouts",
    blurb: "Coming soon via the Health Connect on-device bridge.",
    steps: [
      "Not live yet — Samsung Health needs the same on-device bridge as Apple Health/Fitbit.",
      "Meanwhile, connect COROS or Garmin, or log recovery manually.",
    ],
    manual: "Samsung Health app: Settings → Data → export for manual reference (not structured for direct upload yet).",
  },
];

export const FILE_FORMATS = [
  {
    format: ".FIT",
    best: true,
    note: "The gold standard — full heart rate, pace, power, cadence and lap data. Use this whenever your watch/app offers it.",
  },
  {
    format: ".TCX",
    best: false,
    note: "Good fallback — heart rate, GPS, laps. Supported by most Garmin/Strava exports.",
  },
  {
    format: ".CSV",
    best: false,
    note: "Useful when that's all you have. We reconcile it with any other file you attach to the same session.",
  },
  {
    format: ".GPX",
    best: false,
    note: "On the roadmap — not parsed yet. For now, convert GPX to FIT/CSV or use a webhook.",
  },
];

export const DASHBOARD_METRICS = [
  {
    term: "Fitness (CTL)",
    plain: "Your bank of training over ~6 weeks",
    what: "Chronic Training Load — a rolling average of how much stress you've accumulated. Higher = more race-ready, but only if you absorb it.",
    look: "Trending up over weeks = building. A sudden spike is usually too much too fast.",
  },
  {
    term: "Fatigue (ATL)",
    plain: "How tired your body is right now",
    what: "Acute Training Load — stress from the last ~7 days. This is the short-term load your body is still recovering from.",
    look: "Spikes after hard blocks; should drop during recovery weeks.",
  },
  {
    term: "Form (TSB)",
    plain: "Fresh vs. fatigued",
    what: "Training Stress Balance = Fitness minus Fatigue. Positive = fresh; negative = carrying load.",
    look: "+10 to +25 = race-fresh. -10 to -30 = in a build. Deeply negative for long stretches = burnout risk.",
  },
  {
    term: "Readiness",
    plain: "Are you ready to train hard today?",
    what: "A 0–100 score from your HRV, sleep, resting HR, recovery and current Form — comparable across wearables.",
    look: "Green (75+) = push it. Amber (50–75) = steady. Red (<50) = easy or rest.",
  },
  {
    term: "HRV",
    plain: "Recovery signal from your nervous system",
    what: "Heart Rate Variability — higher (vs. your own baseline) usually means more recovered.",
    look: "Compare to YOUR baseline, not someone else's. A multi-day drop can flag illness/overtraining.",
  },
  {
    term: "Sleep score",
    plain: "Last night's sleep quality",
    what: "From your wearable (or log it manually). Feeds your readiness.",
    look: "One-off low nights are fine; a trend of low scores is a recovery red flag.",
  },
  {
    term: "Resting HR",
    plain: "Morning resting heart rate",
    what: "Lower than your baseline = recovering well; 5+ bpm above baseline = under-recovered or fighting something.",
    look: "Track the trend, not single days.",
  },
];

export const ONBOARDING_STEPS = [
  { n: 1, title: "Create your profile", body: "Enter a recent race result (or an easy run if you're new). We derive VDOT, threshold pace, max HR and heart-rate zones automatically." },
  { n: 2, title: "Pick a training philosophy", body: "Conservative, Moderate or Aggressive — this sets how fast your fitness/fatigue respond to training. You can change it later in Settings." },
  { n: 3, title: "Import your first workout", body: "Connect COROS/Garmin/Strava in Settings, or drop a .FIT/.CSV into Imports. Even one session lights up the dashboard." },
  { n: 4, title: "Add recovery", body: "Connect a recovery source, or log HRV/sleep/resting HR manually in the Recovery Center. Readiness appears the next day." },
  { n: 5, title: "Generate a plan", body: "On the Plan page, generate an adaptive training plan anchored to your goal race. Confirm it to commit it to your calendar." },
];

export const FAQS = [
  { q: "Do I need a watch to use TrainPaceLab?", a: "No. You can log workouts and recovery manually. A watch or wearable just makes it automatic and more complete." },
  { q: "Which file format should I upload?", a: ".FIT is best — it carries the richest data. .TCX and .CSV work too. .GPX is coming soon." },
  { q: "Can I attach two files to one workout?", a: "Yes. Drop a second format (e.g. the FIT behind a CSV) and we reconcile them into one master record without losing the original." },
  { q: "My readiness score differs from my watch's — why?", a: "We compute a holistic, provider-agnostic readiness from your HRV, sleep, resting HR, stress/Body Battery and Form, so your number won't always match Garmin/Oura/Whoop exactly. Both are shown side by side in the Recovery Center." },
  { q: "Is my data private?", a: "Your workouts and recovery are yours and only visible to you (and a coach if you're on a roster). See the privacy page for details." },
];

export const STATUS_META = {
  live: { label: "Live now", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  beta: { label: "Beta", className: "bg-amber-100 text-amber-700 border-amber-200" },
  soon: { label: "Coming soon", className: "bg-blue-100 text-blue-700 border-blue-200" },
};