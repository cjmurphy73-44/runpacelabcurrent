import { getAccessToken } from "@base44/sdk";

function getAppParamValue(name, { defaultValue = null, removeFromUrl = false, persistToLocalStorage = false } = {}) {
  const windowObj = typeof window !== 'undefined' ? window : null;
  if (!windowObj || !windowObj.location) {
    return defaultValue;
  }

  const urlParams = new URLSearchParams(windowObj.location.search);
  let value = urlParams.get(name);

  // Persist bootstrap params (app_id, app_base_url) to localStorage so they
  // survive the full-page reload that follows an OAuth redirect, the
  // redirect URL carries access_token but NOT app_id/app_base_url, so
  // without this the SDK re-initialises with appId=null and every entity
  // call 404s ("Invalid id value -> Object not found"). Only persist when
  // the value is NOT already stored, so a crafted URL can't overwrite a
  // legitimate cached value (same trust model as the initial URL load).
  if (value && persistToLocalStorage) {
    try {
      const existing = windowObj.localStorage?.getItem(name);
      if (!existing) {
        windowObj.localStorage?.setItem(name, value);
      }
    } catch (e) {
      // Ignore storage errors
    }
  }

  if (!value) {
    // Check localStorage fallback if applicable
    try {
      value = windowObj.localStorage?.getItem(name);
    } catch (e) {
      // Ignore storage errors
    }
  }

  if (value && removeFromUrl) {
    urlParams.delete(name);
    try {
      const newRelativePathQuery = windowObj.location.pathname + 
        (urlParams.toString() ? `?${urlParams.toString()}` : '') + 
        windowObj.location.hash;
      windowObj.history.replaceState(null, '', newRelativePathQuery);
    } catch (e) {
      // Ignore history replace state errors in tests
    }
  }

  return value || defaultValue;
}

// Hard fallback for this published app. After an OAuth redirect the URL carries
// access_token but NOT app_id, and if localStorage is empty or holds a stale
// app_id from a different context (preview vs published, another app), the SDK
// would otherwise initialise with appId=null and every entity call 404s
// ("Invalid id value -> Object not found"). This id is fixed for this app.
const PUBLISHED_APP_ID = "6a504ebe6a5a6d1be058226c";
const STAGING_APP_ID = "6aefe9d09e2788fc8591c758";
const hostedAppIds = new Map([
  ['trainpacelab.com', PUBLISHED_APP_ID],
  ['www.trainpacelab.com', PUBLISHED_APP_ID],
  ['trainpacelab.base44.app', PUBLISHED_APP_ID],
  ['train-pace-lab-copy-8591c758.base44.app', STAGING_APP_ID],
]);

export function getAppParams() {
  const windowObj = typeof window !== 'undefined' ? window : {};
  const configuredAppId = import.meta.env?.VITE_BASE44_APP_ID || import.meta.env?.VITE_APP_ID;
  const configuredAppBaseUrl = import.meta.env?.VITE_BASE44_APP_BASE_URL || import.meta.env?.VITE_APP_BASE_URL;
  const hostedAppId = hostedAppIds.get(windowObj.location?.hostname);

  // Hosted builds with an explicit app ID stay pinned across OAuth redirects.
  // Builder bootstraps can still supply an app ID when the build is unconfigured.
  const urlAppId = windowObj.location ? new URLSearchParams(windowObj.location.search).get('app_id') : null;
  const resolvedAppId = hostedAppId || configuredAppId || urlAppId || PUBLISHED_APP_ID;
  const baseUrl = hostedAppId ? windowObj.location.origin : configuredAppBaseUrl;

  return {
    appId: resolvedAppId,
    serverUrl: baseUrl?.replace(/\/+$/, '') || '',
    token: getAccessToken() || getAppParamValue("access_token", { removeFromUrl: true }),
    fromUrl: getAppParamValue("from_url", { defaultValue: windowObj.location?.href || '/' }),
    functionsVersion: hostedAppId ? '' : getAppParamValue("functions_version", { defaultValue: "", persistToLocalStorage: true }),
    appBaseUrl: baseUrl || (configuredAppId
      ? ''
      : getAppParamValue("app_base_url", { defaultValue: "", persistToLocalStorage: true })),
  };
}

export const appParams = getAppParams();
