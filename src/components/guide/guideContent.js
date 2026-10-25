export const STATUS_META = {
  active: { label: 'Active', color: 'green' },
  pending: { label: 'Pending', color: 'yellow' },
  success: { label: 'Success', color: 'green' },
  failed: { label: 'Failed', color: 'red' },
  default: { label: 'Unknown', color: 'gray' }
};

export const PROVIDERS = [
  { id: 'garmin', name: 'Garmin Connect' },
  { id: 'strava', name: 'Strava' },
  { id: 'coros', name: 'COROS' }
];

export const FILE_FORMATS = [
  { ext: '.fit', description: 'Flexible and Interoperable Data Transfer' },
  { ext: '.gpx', description: 'GPS Exchange Format' },
  { ext: '.tcx', description: 'Training Center XML' }
];

export const DASHBOARD_METRICS = [
  { key: 'load', label: 'Training Load' },
  { key: 'compliance', label: 'Workout Compliance' },
  { key: 'form', label: 'Form Score' }
];

export const ONBOARDING_STEPS = [
  { step: 1, title: 'Connect Wearable' },
  { step: 2, title: 'Establish Baseline' },
  { step: 3, title: 'Generate Plan' }
];

export const FAQS = [
  { q: 'How do I sync my watch?', a: 'Link your provider account in settings.' }
];

export const guideContent = {};
export default guideContent;
