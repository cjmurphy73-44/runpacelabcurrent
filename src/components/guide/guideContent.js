export const G = [
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
      "Recovery data writes to your Recovery Center automatically each day."
    ],
    manual: "In the COROS app: open an activity → Share/Export → choose .FIT → save the file, then drop it into Bulk File Upload here."
  },
  {
    id: "garmin",
    name: "Garmin",
    status: "live",
    type: "auto",
    formats: "Workouts + telemetry streams via Garmin Health API",
    blurb: "Direct Garmin OAuth sync is live — connect your account to automatically sync activities and telemetry streams.",
    steps: [
      "Go to Settings → Connected Apps and tap Connect Garmin.",
      "Authorise access in the Garmin Connect window.",
      "Workouts and telemetry streams will sync automatically."
    ],
    manual: "Garmin Connect web: Activities → open an activity → ⋯ → Export Original (downloads a .FIT) if manual backup upload is needed."
  },
  // ... rest of guide array remains as is ...
];
