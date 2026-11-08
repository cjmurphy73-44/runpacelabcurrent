// Provider catalog for the wearable picker, the tailored sync guide and the
// first-data panel. `key` values MUST match the AthleteProfile.primary_wearables
// enum so the selection round-trips through the database intact.
//
// status:
// Catalog capability is not a live connection or successful-sync assertion.
//   auto_sync: connection flow exists; check the account's current status
//   setup_required: availability depends on provider setup
//   coming_soon: direct sync unavailable; use a supported export
//   manual_only: use a supported export
export const WEARABLES = [
  {
    key: "coros",
    label: "COROS",
    icon: "CircleDot",
    status: "auto_sync",
    blurb: "Workouts and recovery",
    instructions:
      "Check your COROS connection and last-sync status in Settings. Scheduled sync depends on the app's configuration; you can also import a supported workout file.",
  },
  {
    key: "garmin",
    label: "Garmin",
    icon: "Watch",
    status: "setup_required",
    blurb: "Check connection availability",
    instructions:
      "Check Garmin connection availability in Settings. If direct sync is unavailable, export a FIT, TCX or CSV file from Garmin Connect and upload it instead.",
  },
  {
    key: "strava",
    label: "Strava",
    icon: "Share2",
    status: "coming_soon",
    blurb: "Export, then upload",
    instructions:
      "Direct Strava sync is not available yet. Export the original activity file from Strava and upload a supported FIT, TCX or CSV file.",
  },
  {
    key: "polar",
    label: "Polar",
    icon: "Heart",
    status: "setup_required",
    blurb: "Provider setup required",
    instructions:
      "Polar recovery sync requires provider setup. Check availability in Settings, or import a supported recovery export or log your recovery manually.",
  },
  {
    key: "whoop",
    label: "WHOOP",
    icon: "Activity",
    status: "setup_required",
    blurb: "Provider setup required",
    instructions:
      "WHOOP recovery sync requires provider setup. Check availability in Settings, or import a supported recovery export or log your recovery manually.",
  },
  {
    key: "oura",
    label: "Oura",
    icon: "CircleDot",
    status: "setup_required",
    blurb: "Provider setup required",
    instructions:
      "Oura recovery sync requires provider setup. Check availability in Settings, or import a supported recovery export or log your recovery manually.",
  },
  {
    key: "apple_watch",
    label: "Apple Watch",
    icon: "Watch",
    status: "manual_only",
    blurb: "Export, then upload",
    instructions:
      "Apple doesn't let a web app read Health directly, export a .fit or .csv workout from your phone and upload it under Import workout files.",
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

export function wearableStatusLabel(status) {
  return {
    auto_sync: "Check connection",
    setup_required: "Setup required",
    coming_soon: "Direct sync unavailable",
    manual_only: "File upload",
  }[status] || "Check availability";
}

// Returns the ordered guide entries for the athlete's selected providers.
// Always an array, callers map over it and check `.length`.
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
