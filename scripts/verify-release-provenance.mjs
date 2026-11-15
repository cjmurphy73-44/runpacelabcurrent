import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const SHA = /^[a-f0-9]{40}$/i;
const DEPLOYMENT = /^dpl_[A-Za-z0-9]+$/;
const APPROVED_DOMAIN = "trainpacelab.com";
const REQUIRED_SMOKES = ["public_home", "login_entry", "mobile_390"];
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function assessReleaseEvidence(evidence, now = new Date()) {
  const errors = [];
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    return { ready: false, errors: ["Evidence must be a JSON object"] };
  }
  const sha = evidence.github?.sha;
  if (!SHA.test(sha ?? "")) errors.push("Missing or invalid 40-character GitHub SHA");
  if (evidence.github?.branch !== "main") errors.push("GitHub source branch must be main");
  const ci = evidence.ci;
  if (ci?.sha !== sha || !SHA.test(ci?.sha ?? "")) errors.push("CI SHA must match GitHub SHA");
  if (ci?.check !== "validate" || ci?.conclusion !== "success" || ci?.status !== "completed" || ci?.integration_id !== 15368) {
    errors.push("Required GitHub validate check must succeed from the approved GitHub Actions integration");
  }
  if (!/^https:\/\/github\.com\/cjmurphy73-44\/runpacelabcurrent\/actions\/runs\/\d+$/.test(ci?.run_url ?? "")) {
    errors.push("Required CI run URL must identify the TrainPaceLab GitHub repository");
  }
  const dep = evidence.vercel;
  if (!DEPLOYMENT.test(dep?.id ?? "")) errors.push("Vercel deployment ID is required");
  if (dep?.sha !== sha || !SHA.test(dep?.sha ?? "")) errors.push("Vercel deployment SHA must match GitHub SHA");
  if (dep?.project_id !== "prj_huPppzjG7s6vOtrQkH00TSUggpok") {
    errors.push("Unexpected Vercel project ID");
  }
  if (dep?.state !== "READY" || dep?.target !== "production") {
    errors.push("Vercel deployment must be READY and target production");
  }
  if (!Array.isArray(dep?.aliases) || !dep.aliases.includes(APPROVED_DOMAIN)) {
    errors.push("Production domain alias trainpacelab.com must be verified on deployment");
  }
  const smoke = evidence.smoke;
  if (smoke?.sha !== sha || smoke?.deployment_id !== dep?.id || smoke?.domain !== APPROVED_DOMAIN) {
    errors.push("Smoke evidence must match GitHub SHA, deployment ID and production domain");
  }
  const at = typeof smoke?.checked_at === "string" ? Date.parse(smoke.checked_at) : NaN;
  const time = now instanceof Date ? now.getTime() : NaN;
  if (!Number.isFinite(at) || !Number.isFinite(time) || at > time || time - at > MAX_AGE_MS) {
    errors.push("Smoke evidence must be timestamped within the past 24 hours");
  }
  for (const name of REQUIRED_SMOKES) {
    if (!Array.isArray(smoke?.checks) || smoke.checks.filter(c => c?.name === name).length !== 1 || !smoke.checks.some(c => c?.name === name && c?.status === "pass" && typeof c?.evidence_url === "string" && /^https:\/\//.test(c.evidence_url))) {
      errors.push(`Missing passing smoke evidence for ${name}`);
    }
  }
  // Frontend evidence alone never certifies the Base44 backend as released.
  const base44 = evidence.base44;
  if (base44?.status !== "verified" || base44?.source_sha !== sha || !base44?.checkpoint_id || !base44?.isolation_verified) {
    errors.push("Base44 source checkpoint and backend isolation must be independently verified");
  }
  return { ready: errors.length === 0, errors };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const filename = process.argv[2];
  if (!filename) {
    console.error("Usage: node scripts/verify-release-provenance.mjs path/to/evidence.json");
    process.exitCode = 2;
  } else {
    try {
      const result = assessReleaseEvidence(JSON.parse(readFileSync(filename, "utf8")));
      console.log(JSON.stringify(result, null, 2));
      if (!result.ready) process.exitCode = 1;
    } catch (error) {
      console.error(`Unable to verify release evidence: ${error.message}`);
      process.exitCode = 2;
    }
  }
}
