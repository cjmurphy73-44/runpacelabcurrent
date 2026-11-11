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

// Vercel exposes VERCEL_ENV to its build process. vite.config.js embeds it
// into import.meta.env.VERCEL_ENV, so previews cannot silently inherit the
// published app ID when VITE_APP_ID is missing.
function isPreviewDeployment(deploymentEnvironment, hostname) {
  return deploymentEnvironment === "preview" ||
    (hostname.endsWith(".vercel.app") && hostname.includes("-git-"));
}

function isValidHttpsBaseUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) &&
      !url.username && !url.password && !url.search && !url.hash;
  } catch {
    return false;
  }
}

// The build-time configuration is authoritative for preview. In particular,
// OAuth URL parameters and browser storage cannot change the target app.
export function getAppParams({
  environment = import.meta.env,
  deploymentEnvironment = environment?.VERCEL_ENV || "",
  hostname = typeof window !== "undefined" ? window.location?.hostname || "" : "",
} = {}) {
  const windowObj = typeof window !== 'undefined' ? window : {};
  if (isPreviewDeployment(deploymentEnvironment, hostname)) {
    const previewAppId = String(environment?.VITE_APP_ID || "").trim();
    const previewBaseUrl = String(environment?.VITE_APP_BASE_URL || "").trim();
    const valid = Boolean(previewAppId) &&
      previewAppId !== PUBLISHED_APP_ID &&
      isValidHttpsBaseUrl(previewBaseUrl);

    // Always strip a returned OAuth token from the address bar, including when
    // misconfigured; never initialize the app or authenticate in that state.
    const token = new URLSearchParams(windowObj.location?.search || "").get("access_token");
    getAppParamValue("access_token", { removeFromUrl: true });
    return {
      appId: valid ? previewAppId : null,
      token: valid ? token : null,
      fromUrl: windowObj.location?.href || "/",
      functionsVersion: "",
      appBaseUrl: valid ? previewBaseUrl : "",
      configurationError: valid ? null :
        "Preview requires a verified staging VITE_APP_ID and HTTPS VITE_APP_BASE_URL. Published app IDs are not allowed.",
    };
  }


  const windowObj = typeof window !== 'undefined' ? window : {};
  const envAppId = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_APP_ID || PUBLISHED_APP_ID) : PUBLISHED_APP_ID;

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