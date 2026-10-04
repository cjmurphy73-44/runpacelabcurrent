// src/lib/app-params.js

function getAppParamValue(name, { defaultValue = null, removeFromUrl = false } = {}) {
  const windowObj = typeof window !== 'undefined' ? window : null;
  if (!windowObj || !windowObj.location) {
    return defaultValue;
  }

  const urlParams = new URLSearchParams(windowObj.location.search);
  let value = urlParams.get(name);

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
    appId: getAppParamValue("app_id", { defaultValue: typeof import.meta !== 'undefined' ? import.meta.env?.VITE_APP_ID : undefined }),
    token: getAppParamValue("access_token", { removeFromUrl: true }),
    fromUrl: getAppParamValue("from_url", { defaultValue: windowObj.location?.href || '/' }),
    functionsVersion: getAppParamValue("functions_version", { defaultValue: "" }),
    appBaseUrl: getAppParamValue("app_base_url", { defaultValue: typeof import.meta !== 'undefined' ? import.meta.env?.VITE_APP_BASE_URL : "" }),
  };
}

export const appParams = getAppParams();