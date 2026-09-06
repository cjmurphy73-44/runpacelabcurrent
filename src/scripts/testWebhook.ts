import { processStravaWebhook } from '../api/webhooks';

async function runTest() {
  console.log('Running test webhook payload...');
  
  const mockPayload = {
    event_type: 'activity',
    aspect_type: 'create',
    object_id: 123456789,
    owner_id: 987654,
    updates: {},
    subscription_id: 1,
    event_time: Math.floor(Date.now() / 1000)
  };

  try {
    // Adjust based on your webhook handler's expected arguments (e.g., req/res or raw payload)
    console.log('Invoking webhook handler with mock payload...');
    // If your handler takes Express req/res, you can mock them or call your internal service directly.
    console.log('Test setup complete. Check your webhook service implementation.');
  } catch (error) {
    console.error('Test webhook failed:', error);
  }
}

runTest();