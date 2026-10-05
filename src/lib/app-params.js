// src/lib/app-params.js

function getAppParamValue(name, { defaultValue = null, removeFromUrl = false, persistToLocalStorage = false } = {}) {
  const windowObj = typeof window !== 'undefined' ? window : null;
  if (!windowObj || !windowObj.location) {
    return defaultValue;
  }

  const urlParams = new URLSearchParams(windowObj.location.search);
  let value = urlParams.get(name);

  // Persist bootstrap params (app_id, app_base_url) to localStorage so they
  // survive the full-page reload that follows an OAuth redirect — the
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

export function getAppParams() {
  const windowObj = typeof window !== 'undefined' ? window : {};

  return {
    appId: getAppParamValue("app_id", { defaultValue: typeof import.meta !== 'undefined' ? import.meta.env?.VITE_APP_ID : undefined, persistToLocalStorage: true }),
    token: getAppParamValue("access_token", { removeFromUrl: true }),
    fromUrl: getAppParamValue("from_url", { defaultValue: windowObj.location?.href || '/' }),
    functionsVersion: getAppParamValue("functions_version", { defaultValue: "", persistToLocalStorage: true }),
    appBaseUrl: getAppParamValue("app_base_url", { defaultValue: typeof import.meta !== 'undefined' ? import.meta.env?.VITE_APP_BASE_URL : "", persistToLocalStorage: true }),
  };
}

export const appParams = getAppParams();