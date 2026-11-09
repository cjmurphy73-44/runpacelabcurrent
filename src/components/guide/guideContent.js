import { WEARABLES, wearableStatusLabel } from '@/lib/wearableCatalog';

// Keep provider capability guidance aligned with onboarding and the dashboard.
// These labels do not certify a live connection or successful provider sync.
const neutralStatus = 'bg-muted text-muted-foreground border-border';
export const STATUS_META = {
  auto_sync: { label: wearableStatusLabel('auto_sync'), className: neutralStatus },
  setup_required: { label: wearableStatusLabel('setup_required'), className: neutralStatus },
  coming_soon: { label: wearableStatusLabel('coming_soon'), className: neutralStatus },
  manual_only: { label: wearableStatusLabel('manual_only'), className: neutralStatus },
  default: { label: 'Check availability', className: neutralStatus },
};

export const PROVIDERS = WEARABLES.map((provider) => ({
  id: provider.key,
  name: provider.label,
  status: provider.status,
  type: provider.status === 'manual_only' || provider.status === 'coming_soon' ? 'manual' : 'connection',
  blurb: provider.blurb,
  formats: provider.key === 'apple_health' ? 'Supported recovery CSV / JSON' : 'Supported workout or recovery exports',
  steps: [provider.instructions],
  manual: 'Use a supported export on Imports & Sync, or log your workout and recovery manually.',
}));

export const FILE_FORMATS = [
  { format: 'FIT', best: true, note: 'Original workout recording where available. Supported channels depend on the recording.' },
  { format: 'CSV', note: 'Supported workout or recovery columns; check the import form for the expected fields.' },
  { format: 'TCX', note: 'Check the selected uploader for TCX support; convert to FIT or supported CSV if needed.' },
  { format: 'GPX', note: 'Not supported by the current workout uploader. Use a supported FIT or CSV export.' },
];

export const DASHBOARD_METRICS = [
  { term: 'Fitness / CTL', plain: 'longer-term training load', what: 'An estimate of your recent training load over the longer time window.', look: 'Look for gradual, sustainable changes rather than chasing a target number.' },
  { term: 'Fatigue / ATL', plain: 'shorter-term training load', what: 'An estimate of your more recent training stress.', look: 'Compare it with your recovery and how you feel.' },
  { term: 'Form / TSB', plain: 'fitness minus fatigue', what: 'The difference between estimated fitness and fatigue.', look: 'Interpret the trend alongside your training plan, not as a diagnosis.' },
  { term: 'Readiness', plain: 'available recovery signals', what: 'A synthesis of available recovery inputs. Missing signals should remain visible.', look: 'Check signal availability and provenance before acting on the score.' },
];

export const ONBOARDING_STEPS = [
  { n: 1, title: 'Sign in', body: 'Use an accepted account for the app you are testing.' },
  { n: 2, title: 'Create your athlete profile', body: 'Complete the short onboarding flow. Use synthetic details in staging.' },
  { n: 3, title: 'Bring in your first data', body: 'Check available connections, upload a supported file or log a session manually.' },
  { n: 4, title: 'Review your dashboard', body: 'Check what arrived, which metrics are estimates and which recovery inputs are still missing.' },
];

export const FAQS = [
  { q: 'Does selecting a wearable connect it?', a: 'No. Selection tailors the instructions. Check availability and complete the supported connection flow separately.' },
  { q: 'Do I need a device to start?', a: 'No. You can log workouts and recovery manually or import a supported export.' },
  { q: 'Where is the day/night switch?', a: 'Use the sun or moon button next to Account in the app header. Your choice is saved on this browser.' },
];

export const guideContent = { PROVIDERS, FILE_FORMATS, DASHBOARD_METRICS, ONBOARDING_STEPS, FAQS };
export default guideContent;
