// src/lib/wearableCatalog.js
//
// Source of truth for every wearable/tracking ecosystem RunPaceLab recognises.
// Drives the onboarding hardware-selection step, the tailored dashboard sync
// guide, and the settings/data-connections surface. Each entry describes how
// data actually flows into the platform and the user-facing sync instructions
// so onboarding can tailor guidance to the athlete's chosen stack.

export const WEARABLES = [
  {
    key: "garmin",
    label: "Garmin",
    category: "watch",
    icon: "Watch",
    syncMethod: "oauth",
    status: "available",
    dataFlow: "Garmin Connect → TrainPaceLab (activities + recovery via Garmin Health)",
    syncInstructions:
      "Connect your Garmin account under Settings → Data Connections. Activities, HRV, sleep and resting HR sync automatically every few hours.",
    coverage: ["workouts", "hrv", "sleep", "resting_hr", "readiness"],
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
    status: "available",
    dataFlow: "Polar Flow → TrainPaceLab (recovery: HRV, sleep, readiness)",
    syncInstructions:
      "Connect Polar under Settings → Data Connections to sync recovery metrics. Workout files can also be uploaded directly on the Import page.",
    coverage: ["hrv", "sleep", "resting_hr", "readiness"],
  },
  {
    key: "whoop",
    label: "WHOOP",
    category: "strap",
    icon: "Activity",
    syncMethod: "oauth",
    status: "available",
    dataFlow: "WHOOP → TrainPaceLab (recovery, sleep, HRV, strain)",
    syncInstructions:
      "Authorize WHOOP under Settings → Data Connections. Recovery, sleep and HRV sync automatically so your daily readiness score stays current.",
    coverage: ["hrv", "sleep", "readiness"],
  },
  {
    key: "oura",
    label: "Oura Ring",
    category: "ring",
    icon: "CircleDot",
    syncMethod: "oauth",
    status: "available",
    dataFlow: "Oura → TrainPaceLab (readiness, sleep, HRV, resting HR)",
    syncInstructions:
      "Connect Oura under Settings → Data Connections. Readiness, sleep, HRV and resting HR sync automatically each day.",
    coverage: ["hrv", "sleep", "resting_hr", "readiness"],
  },
  {
    key: "strava",
    label: "Strava",
    category: "platform",
    icon: "Share2",
    syncMethod: "oauth",
    status: "available",
    dataFlow: "Strava → TrainPaceLab (activities with streams via webhook push)",
    syncInstructions:
      "Connect Strava under Settings → Data Connections. New activities push automatically to RunPaceLab through a webhook, with full telemetry streams.",
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

// Build the tailored sync-instructions list for an athlete's selected stack.
export function syncGuideFor(selectedKeys = []) {
  return selectedKeys
    .map((k) => WEARABLE_BY_KEY[k])
    .filter(Boolean)
    .map((w) => ({ key: w.key, label: w.label, status: w.status, instructions: w.syncInstructions, dataFlow: w.dataFlow }));
}