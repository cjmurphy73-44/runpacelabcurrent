import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl, serverUrl } = appParams;
const isLocalWithoutBackend = !serverUrl && ['localhost', '127.0.0.1', '[::1]'].includes(globalThis.location?.hostname);

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: serverUrl || '',
  analytics: { enabled: !isLocalWithoutBackend },
  requiresAuth: false,
  appBaseUrl
});
