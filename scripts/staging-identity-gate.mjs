// Release-only guard. Does not initialise Base44, read credentials or modify runtime.
// Require explicit preview values, never infer safety from a successful Vercel build.
export const PRODUCTION_APP_ID = "6a504ebe6a5a6d1be058226c";

export function validateStagingIdentity({ stagingAppId, productionAppId = PRODUCTION_APP_ID, stagingBaseUrl, productionBaseUrl } = {}) {
  const id = typeof stagingAppId === "string" ? stagingAppId.trim() : "";
  const prod = typeof productionAppId === "string" ? productionAppId.trim() : "";
  if (!id || !prod || !/^[a-f0-9]{24}$/i.test(id) || !/^[a-f0-9]{24}$/i.test(prod)) return { ok: false, reason: "missing-or-invalid-app-id" };
  if (id.toLowerCase() === prod.toLowerCase()) return { ok: false, reason: "production-app-id" };
  if (!stagingBaseUrl || !productionBaseUrl) return { ok: false, reason: "missing-base-url" };
  let staging, production;
  try {
    staging = new URL(stagingBaseUrl);
    production = new URL(productionBaseUrl);
  } catch {
    return { ok: false, reason: "invalid-base-url" };
  }
  if (staging.protocol !== "https:" || production.protocol !== "https:" || staging.username || staging.password || production.username || production.password || staging.search || staging.hash || production.search || production.hash) {
    return { ok: false, reason: "unsafe-base-url" };
  }
  if (staging.hostname.toLowerCase() === production.hostname.toLowerCase() && (staging.port || "") === (production.port || "")) {
    return { ok: false, reason: "production-base-url" };
  }
  return { ok: true, reason: "explicit-distinct-identity" };
}
