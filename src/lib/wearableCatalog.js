export const WEARABLES = [
  { id: 'garmin', name: 'Garmin' },
  { id: 'coros', name: 'COROS' },
  { id: 'strava', name: 'Strava' },
  { id: 'polar', name: 'Polar' }
];

export function syncGuideFor(wearableId) {
  return {
    title: `How to sync ${wearableId}`,
    steps: [
      'Open your device companion app',
      'Ensure account linking is active',
      'Trigger a manual sync or upload'
    ]
  };
}
