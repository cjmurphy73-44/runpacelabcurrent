import { WebhookHandler } from './src/lib/telemetry/WebhookHandler.ts';

const mockStravaPayload = {
  object_id: 123456,
  event_time: Math.floor(Date.now() / 1000),
  elapsed_time: 3600,
  type: 'cycling'
};

const mockGarminPayload = {
  id: 'g-98765',
  startTime: new Date().toISOString(),
  durationSeconds: 1800,
  sportType: 'running'
};

console.log('Testing Strava Adapter...');
const stravaResult = WebhookHandler.handle('strava', mockStravaPayload);
console.log('Strava Result:', stravaResult);

console.log('Testing Garmin Adapter...');
const garminResult = WebhookHandler.handle('garmin', mockGarminPayload);
console.log('Garmin Result:', garminResult);
