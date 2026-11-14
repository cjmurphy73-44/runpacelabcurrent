// src/lib/app-params.js

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

// Opt-in preview guard: never infer staging from a hostname or a default app ID.
// The build must explicitly opt in and provide its expected separate Base44 ID.
export function resolvePreviewIdentity({ required = false, expectedAppId, configuredAppId, urlAppId, storedAppId, publishedAppId = PUBLISHED_APP_ID } = {}) {
  if (!required) return { enforced: false };
  const valid = (value) => typeof value === "string" && /^[a-f0-9]{24}$/i.test(value);
  if (!valid(expectedAppId) || expectedAppId.toLowerCase() === publishedAppId.toLowerCase()) {
    throw new Error("Preview identity blocked: distinct expected staging app ID required");
  }
  if (!valid(configuredAppId) || configuredAppId.toLowerCase() !== expectedAppId.toLowerCase()) {
    throw new Error("Preview identity blocked: build app ID differs from staging");
  }
  if (urlAppId && urlAppId.toLowerCase() !== expectedAppId.toLowerCase()) {
    throw new Error("Preview identity blocked: URL app ID differs from staging");
  }
  // A stale production localStorage value must never override a preview build.
  return { enforced: true, appId: expectedAppId };
}

export function getAppParams() {
  const windowObj = typeof window !== 'undefined' ? window : {};
  const envAppId = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_APP_ID || PUBLISHED_APP_ID) : PUBLISHED_APP_ID;

  const previewRequired = import.meta.env?.VITE_STAGING_PREVIEW_REQUIRED === "true";
  const previewUrlId = windowObj?.location ? new URLSearchParams(windowObj.location.search).get("app_id") : null;
  const previewStoredId = (() => {
    try { return windowObj?.localStorage?.getItem("app_id") || null; } catch { return null; }
  })();
  const preview = resolvePreviewIdentity({
    required: previewRequired,
    expectedAppId: import.meta.env?.VITE_STAGING_APP_ID,
    configuredAppId: import.meta.env?.VITE_APP_ID,
    urlAppId: previewUrlId,
    storedAppId: previewStoredId,
  });
  if (preview.enforced) {
    const base = import.meta.env?.VITE_APP_BASE_URL;
    const publishedBase = import.meta.env?.VITE_PRODUCTION_BASE44_BASE_URL;
    if (!base || !publishedBase || !/^https:\/\/[^/?#@]+(?:\/)?$/.test(base) || !/^https:\/\/[^/?#@]+(?:\/)?$/.test(publishedBase) || new URL(base).origin.toLowerCase() === new URL(publishedBase).origin.toLowerCase()) {
      throw new Error("Preview identity blocked: explicit HTTPS staging base URL required");
    }
    // No fallback to a published app or localStorage. URL mismatches fail before SDK initialization.
    return {
      appId: preview.appId,
      token: getAppParamValue("access_token", { removeFromUrl: true }),
      fromUrl: getAppParamValue("from_url", { defaultValue: windowObj.location?.href || '/' }),
      functionsVersion: getAppParamValue("functions_version", { defaultValue: "" }),
      appBaseUrl: base,
    };
  }

  // Resolve app_id with stale-storage guard: the URL value (present on normal
  // page loads) is authoritative; if absent (post-OAuth redirect), fall back to
  // localStorage, but ONLY if it matches this app's known id, a stale value
  // left by a different Base44 app in the same browser would otherwise init the
  // SDK with the wrong appId and 404 every entity call. Final fallback is the
  // hardcoded published id so the client can never initialise with appId=null.
  let resolvedAppId = null;
  if (windowObj?.location) {
    const urlAppId = new URLSearchParams(windowObj.location.search).get("app_id");
    if (urlAppId) {
      resolvedAppId = urlAppId;
      try { if (!windowObj.localStorage?.getItem("app_id")) windowObj.localStorage?.setItem("app_id", urlAppId); } catch {}
    } else {
      let stored = null;
      try { stored = windowObj.localStorage?.getItem("app_id"); } catch {}
      resolvedAppId = stored === PUBLISHED_APP_ID ? stored : envAppId;
    }
  }
  if (!resolvedAppId) resolvedAppId = envAppId;

  return {
    appId: resolvedAppId,
    token: getAppParamValue("access_token", { removeFromUrl: true }),
    fromUrl: getAppParamValue("from_url", { defaultValue: windowObj.location?.href || '/' }),
    functionsVersion: getAppParamValue("functions_version", { defaultValue: "", persistToLocalStorage: true }),
    appBaseUrl: getAppParamValue("app_base_url", { defaultValue: typeof import.meta !== 'undefined' ? import.meta.env?.VITE_APP_BASE_URL : "", persistToLocalStorage: true }),
  };
}

export const appParams = getAppParams();