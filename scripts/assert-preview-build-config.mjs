// Build-time safety: a Vercel preview cannot silently omit runtime staging protection.
export function assertPreviewBuildConfig(env = {}) {
  if (env.VERCEL_ENV !== "preview") return;
  if (env.VITE_STAGING_PREVIEW_REQUIRED !== "true") {
    throw new Error("Preview build blocked: staging identity guard must be enabled");
  }
  const required = [
    "VITE_STAGING_APP_ID",
    "VITE_APP_ID",
    "VITE_APP_BASE_URL",
    "VITE_PRODUCTION_BASE44_BASE_URL",
  ];
  if (required.some((key) => !env[key])) {
    throw new Error("Preview build blocked: missing explicit Base44 staging identity configuration");
  }
  if (env.VITE_BASE44_APP_ID && env.VITE_BASE44_APP_ID !== env.VITE_STAGING_APP_ID) {
    throw new Error("Preview build blocked: Base44 plugin identity differs from staging");
  }
}
