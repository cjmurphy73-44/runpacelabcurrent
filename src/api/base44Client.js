import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl, apiServerUrl } = appParams;

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  // Preview targets its isolated Base44 API; production retains legacy routing.
  serverUrl: apiServerUrl,
  requiresAuth: false,
  appBaseUrl
});
