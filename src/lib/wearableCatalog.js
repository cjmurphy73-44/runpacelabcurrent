// src/lib/wearableCatalog.js
//
// Source of truth for every wearable/tracking ecosystem TrainPaceLab recognises.
// Drives the onboarding hardware-selection step, the tailored dashboard sync
// guide, and the settings/data-connections surface. Each entry describes how
// data actually flows into the platform and the user-facing sync instructions
// so onboarding can tailor guidance to the athlete's chosen stack.
//
// status values:
//   available     — direct automated sync is configured and working today
//   setup_required — the OAuth provider code exists but client credentials are
//                    not yet set as app secrets; the user must complete setup
//                    before direct sync works (manual upload still works)
//   coming_soon    — direct sync is in development; manual upload is the only path
//   manual_only    — no direct web API exists; upload is the only path

export const WEARABLES = [
  {
    key: "garmin",
    label: "Garmin",
    category: "watch",
    icon: "Watch",
    syncMethod: "manual",
    status: "coming_soon",
    dataFlow: "Garmin Connect → export .fit → upload (direct sync in development)",
    syncInstructions:
      "Direct Garmin sync is coming soon. For now, export .fit files from Garmin Connect (Activity → ⋯ → Export Original) and drop them into the Import page — they ingest just like any other workout file.",
    coverage: ["workouts"],
  },
  {
    key: "coros",
    label: "COROS",
    category: "watch",
    icon: "Watch",
    syncMethod: "oauth",
    status: "available",
    dataFlow: "COROS → TrainPaceLab (activities, recovery status, sleep, HRV)",
    syncInstructions:
      "Authorize COROS under Settings → Data Connections. An automated sync runs every 4 hours and pulls activities plus recovery signals.",
    coverage: ["workouts", "hrv", "sleep", "readiness"],
  },
  {
    key: "apple_watch",
    label: "Apple Watch",
    category: "watch",
    icon: "Watch",
    syncMethod: "manual",
    status: "manual_only",
    dataFlow: "Apple Health → export .fit/.tcx → upload (no direct web API yet)",
    syncInstructions:
      "There's no direct Apple Health web connection yet. Export workouts from Apple Health as .fit or .tcx and upload them on the Import page — or link through Strava as a bridge.",
    coverage: ["workouts"],
  },
  {
    key: "polar",
    label: "Polar",
    category: "watch",
    icon: "Watch",
    syncMethod: "oauth",
    status: "setup_required",
    dataFlow: "Polar Flow → TrainPaceLab (recovery: HRV, sleep, readiness)",
    syncInstructions:
      "Polar recovery sync is ready to connect once the team adds Polar client credentials. Workout files can be uploaded directly on the Import page in the meantime.",
    coverage: ["hrv", "sleep", "resting_hr", "readiness"],
  },
  {
    key: "whoop",
    label: "WHOOP",
    category: "strap",
    icon: "Activity",
    syncMethod: "oauth",
    status: "setup_required",
    dataFlow: "WHOOP → TrainPaceLab (recovery, sleep, HRV, strain)",
    syncInstructions:
      "WHOOP recovery sync is ready to connect once the team adds WHOOP client credentials. Recovery, sleep and HRV will sync automatically once configured.",
    coverage: ["hrv", "sleep", "readiness"],
  },
  {
    key: "oura",
    label: "Oura Ring",
    category: "ring",
    icon: "CircleDot",
    syncMethod: "oauth",
    status: "setup_required",
    dataFlow: "Oura → TrainPaceLab (readiness, sleep, HRV, resting HR)",
    syncInstructions:
      "Oura recovery sync is ready to connect once the team adds Oura client credentials. Readiness, sleep, HRV and resting HR will sync automatically once configured.",
    coverage: ["hrv", "sleep", "resting_hr", "readiness"],
  },
  {
    key: "withings",
    label: "Withings",
    category: "watch",
    icon: "Watch",
    syncMethod: "oauth",
    status: "setup_required",
    dataFlow: "Withings → TrainPaceLab (sleep, HRV, RHR, body comp)",
    syncInstructions:
      "Withings recovery sync is ready to connect once the team adds Withings client credentials.",
    coverage: ["hrv", "sleep", "resting_hr"],
  },
  {
    key: "fitbit",
    label: "Fitbit",
    category: "watch",
    icon: "Watch",
    syncMethod: "oauth",
    status: "setup_required",
    dataFlow: "Fitbit → TrainPaceLab (sleep score, HRV, resting HR)",
    syncInstructions:
      "Fitbit recovery sync is ready to connect once the team adds Fitbit client credentials.",
    coverage: ["hrv", "sleep", "resting_hr"],
  },
  {
    key: "suunto",
    label: "Suunto",
    category: "watch",
    icon: "Watch",
    syncMethod: "oauth",
    status: "setup_required",
    dataFlow: "Suunto → TrainPaceLab (sleep + activity summary)",
    syncInstructions:
      "Suunto recovery sync is ready to connect once the team adds Suunto client credentials.",
    coverage: ["sleep"],
  },
  {
    key: "strava",
    label: "Strava",
    category: "platform",
    icon: "Share2",
    syncMethod: "manual",
    status: "coming_soon",
    dataFlow: "Strava → export .fit/.gpx → upload (direct sync in development)",
    syncInstructions:
      "Direct Strava sync is coming soon. For now, export activities from Strava as .fit and upload them on the Import page, or connect a COROS watch for automatic sync today.",
    coverage: ["workouts"],
  },
  {
    key: "apple_health",
    label: "Apple Health",
    category: "platform",
    icon: "Heart",
    syncMethod: "manual",
    status: "manual_only",
    dataFlow: "Apple Health → export → upload (no direct API yet)",
    syncInstructions:
      "Apple Health has no direct web API. Export data from the Health app and upload files on the Import page, or use Strava / Apple Watch as a bridge.",
    coverage: [],
  },
];

export const WEARABLE_BY_KEY = Object.fromEntries(WEARABLES.map((w) => [w.key, w]));

// Friendly label for a stored wearable key, tolerating unknowns gracefully.
export function wearableLabel(key) {
  return WEARABLE_BY_KEY[key]?.label ?? key;
}

// Whether a given wearable needs a manual upload step (no direct connection).
export function isManualOnly(key) {
  return WEARABLE_BY_KEY[key]?.status === "manual_only";
}

// Whether a given wearable's direct sync is fully configured and working.
export function isAvailable(key) {
  return WEARABLE_BY_KEY[key]?.status === "available";
}

// Build the tailored sync-instructions list for an athlete's selected stack.
export function syncGuideFor(selectedKeys = []) {
  return selectedKeys
    .map((k) => WEARABLE_BY_KEY[k])
    .filter(Boolean)
    .map((w) => ({ key: w.key, label: w.label, status: w.status, instructions: w.syncInstructions, dataFlow: w.dataFlow }));
}