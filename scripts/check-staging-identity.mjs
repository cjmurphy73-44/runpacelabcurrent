// Usage: node scripts/check-staging-identity.mjs
// Supply explicit non-secret app IDs and public base URLs. Never print their values.
import { validateStagingIdentity } from "./staging-identity-gate.mjs";

const result = validateStagingIdentity({
  stagingAppId: process.env.STAGING_BASE44_APP_ID,
  productionAppId: process.env.PRODUCTION_BASE44_APP_ID,
  stagingBaseUrl: process.env.STAGING_BASE44_BASE_URL,
  productionBaseUrl: process.env.PRODUCTION_BASE44_BASE_URL,
});
if (!result.ok) {
  console.error(`Staging acceptance BLOCKED: ${result.reason}`);
  process.exitCode = 1;
} else {
  console.log("Staging identity configuration check passed (distinct IDs and HTTPS origins). Backend isolation still requires independent verification.");
}
