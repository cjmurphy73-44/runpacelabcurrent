// Provider catalog for the wearable picker, the tailored sync guide and the
// first-data panel. `key` values MUST match the AthleteProfile.primary_wearables
// enum so the selection round-trips through the database intact.
//
// status:
//   auto_sync   — a real OAuth connection exists in the app, data pulls in
//   manual_only — no web-readable feed; the athlete uploads an export instead
export const WEARABLES = [
  {
    key: "coros",
    label: "COROS",
    icon: "CircleDot",
    status: "auto_sync",
    blurb: "Workouts and recovery",
    instructions:
      "Connect COROS once under Connect a device — new runs and recovery metrics then pull in on demand or on the nightly sync.",
  },
  {
    key: "garmin",
    label: "Garmin",
    icon: "Watch",
    status: "auto_sync",
    blurb: "Activities, sleep, HRV",
    instructions:
      "Connect Garmin under Connect a device. If Garmin doesn't cover your account, export a .fit or .csv from Garmin Connect and upload it instead.",
  },
  {
    key: "strava",
    label: "Strava",
    icon: "Share2",
    status: "auto_sync",
    blurb: "Every recorded activity",
    instructions:
      "Connect Strava under Connect a device — each new activity is fetched automatically after it uploads.",
  },
  {
    key: "polar",
    label: "Polar",
    icon: "Heart",
    status: "auto_sync",
    blurb: "Recovery and sleep",
    instructions:
      "Connect Polar under Recovery in Settings to sync HRV, sleep and resting heart rate.",
  },
  {
    key: "whoop",
    label: "WHOOP",
    icon: "Activity",
    status: "auto_sync",
    blurb: "Recovery and sleep",
    instructions:
      "Connect WHOOP under Recovery in Settings to sync recovery, strain and sleep nightly.",
  },
  {
    key: "oura",
    label: "Oura",
    icon: "CircleDot",
    status: "auto_sync",
    blurb: "Readiness, sleep, HRV",
    instructions:
      "Connect Oura under Recovery in Settings to sync readiness, sleep and HRV.",
  },
  {
    key: "apple_watch",
    label: "Apple Watch",
    icon: "Watch",
    status: "manual_only",
    blurb: "Export, then upload",
    instructions:
      "Apple doesn't let a web app read Health directly — export a .fit or .csv workout from your phone and upload it under Import workout files.",
  },
  {
    key: "apple_health",
    label: "Apple Health",
    icon: "Smartphone",
    status: "manual_only",
    blurb: "Export, then upload",
    instructions:
      "Export an Apple Health summary (CSV or JSON) with a third-party exporter, then upload it under Recovery & sleep.",
  },
];

export const WEARABLE_MAP = WEARABLES.reduce((acc, w) => {
  acc[w.key] = w;
  return acc;
}, {});

// Returns the ordered guide entries for the athlete's selected providers.
// Always an array — callers map over it and check `.length`.
export function syncGuideFor(selected = []) {
  const keys = Array.isArray(selected) ? selected : [];
  return keys
    .map((key) => WEARABLE_MAP[key])
    .filter(Boolean)
    .map((w) => ({
      key: w.key,
      label: w.label,
      status: w.status,
      instructions: w.instructions,
    }));
}