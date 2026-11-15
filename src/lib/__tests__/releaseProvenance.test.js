import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { assessReleaseEvidence } from "../../../scripts/verify-release-provenance.mjs";

const sha = "a".repeat(40);
const now = new Date("2026-11-15T06:00:00.000Z");

function good() {
  return {
    github: { branch: "main", sha },
    ci: { sha, check: "validate", integration_id: 15368, status: "completed", conclusion: "success",
      run_url: "https://github.com/cjmurphy73-44/runpacelabcurrent/actions/runs/12345" },
    vercel: { sha, id: "dpl_A12345", state: "READY", target: "production",
      project_id: "prj_huPppzjG7s6vOtrQkH00TSUggpok",
      aliases: ["trainpacelab.com", "www.trainpacelab.com"] },
    smoke: { sha, deployment_id: "dpl_A12345", domain: "trainpacelab.com",
      checked_at: "2026-11-15T05:50:00.000Z",
      checks: ["public_home", "login_entry", "mobile_390"].map(name => ({
        name, status: "pass", evidence_url: "https://github.com/cjmurphy73-44/runpacelabcurrent/issues/24",
      })) },
    base44: { status: "verified", checkpoint_id: "synthetic-checkpoint",
      published_checkpoint_id: "synthetic-checkpoint", source_revision: "base44-source-A",
      backend_revision: "backend-rev-B",
      source_mapping: { status: "verified", github_sha: sha,
        base44_source_revision: "base44-source-A", evidence_url: "https://example.com/mapping" },
      isolation: { status: "verified", evidence_url: "https://example.com/isolation" } },
  };
}
describe("REL-002 release provenance acceptance", () => {
  it("accepts a complete *synthetic* matching record", () => {
    expect(assessReleaseEvidence(good(), now)).toEqual({ evidenceConsistent: true, releaseAuthorized: false, errors: [] });
  });
  it("fails closed for missing and malformed evidence", () => {
    expect(assessReleaseEvidence(null, now).evidenceConsistent).toBe(false);
    expect(assessReleaseEvidence({}, now).evidenceConsistent).toBe(false);
  });
  it("rejects SHA mismatch even with green CI and READY deployment", () => {
    const item = good(); item.vercel.sha = "b".repeat(40);
    expect(assessReleaseEvidence(item, now).evidenceConsistent).toBe(false);
  });
  it("rejects Vercel preview deployed as production", () => {
    const item = good(); item.vercel.target = null;
    expect(assessReleaseEvidence(item, now).evidenceConsistent).toBe(false);
  });
  it("rejects missing verified canonical production alias", () => {
    const item = good(); item.vercel.aliases = ["runpacelabcurrent.vercel.app"];
    expect(assessReleaseEvidence(item, now).evidenceConsistent).toBe(false);
  });
  it("rejects an outdated smoke or absent evidence", () => {
    const item = good(); item.smoke.checked_at = "2026-11-12T00:00:00Z";
    expect(assessReleaseEvidence(item, now).evidenceConsistent).toBe(false);
    item.smoke.checked_at = "2026-11-15T05:50:00Z";
    item.smoke.checks[1].evidence_url = "";
    expect(assessReleaseEvidence(item, now).evidenceConsistent).toBe(false);
  });
  it("rejects an unverified or diverged Base44 checkpoint", () => {
    const item = good(); item.base44.status = "unknown";
    expect(assessReleaseEvidence(item, now).evidenceConsistent).toBe(false);
    item.base44.status = "verified"; item.base44.source_mapping.github_sha = "b".repeat(40);
    expect(assessReleaseEvidence(item, now).evidenceConsistent).toBe(false);
  });
  it("allows distinct GitHub, Base44 source and backend revision identities with a verified mapping", () => {
    const item = good();
    expect(item.base44.source_revision).not.toBe(sha);
    expect(item.base44.backend_revision).not.toBe(item.base44.source_revision);
    expect(assessReleaseEvidence(item, now).evidenceConsistent).toBe(true);
  });
  it("rejects a source mapping that does not match the published Base44 source revision", () => {
    const item = good(); item.base44.source_mapping.base44_source_revision = "unrelated-source";
    expect(assessReleaseEvidence(item, now).evidenceConsistent).toBe(false);
  });
  it("rejects missing source-mapping proof or unverified staging", () => {
    const item = good(); delete item.base44.source_mapping.evidence_url;
    expect(assessReleaseEvidence(item, now).evidenceConsistent).toBe(false);
    item.base44.source_mapping.evidence_url = "https://example.com/mapping";
    item.base44.isolation.status = "unknown";
    expect(assessReleaseEvidence(item, now).evidenceConsistent).toBe(false);
  });
  it("rejects checkpoint mismatches and missing backend revision", () => {
    const item = good(); item.base44.published_checkpoint_id = "older-checkpoint";
    expect(assessReleaseEvidence(item, now).evidenceConsistent).toBe(false);
    item.base44.published_checkpoint_id = item.base44.checkpoint_id;
    item.base44.backend_revision = "";
    expect(assessReleaseEvidence(item, now).evidenceConsistent).toBe(false);
  });
  it("never authorizes deployment even with complete self-reported evidence", () => {
    expect(assessReleaseEvidence(good(), now)).toMatchObject({ evidenceConsistent: true, releaseAuthorized: false });
  });
  it("CLI returns zero only for consistent synthetic records and nonzero for contradictions", () => {
    const folder = mkdtempSync(join(tmpdir(), "tpl-provenance-"));
    const file = join(folder, "evidence.json");
    const run = () => spawnSync(process.execPath, ["scripts/verify-release-provenance.mjs", file], {cwd: process.cwd(), encoding: "utf8"});
    try {
      const valid = good();
      valid.smoke.checked_at = new Date().toISOString();
      writeFileSync(file, JSON.stringify(valid));
      const pass = run();
      expect(pass.status).toBe(0);
      expect(JSON.parse(pass.stdout).releaseAuthorized).toBe(false);
      valid.vercel.sha = "b".repeat(40);
      writeFileSync(file, JSON.stringify(valid));
      const fail = run();
      expect(fail.status).toBe(1);
    } finally { rmSync(folder, { recursive: true, force: true }); }
  });
  it("rejects an untrusted CI integration", () => {
    const item = good(); item.ci.integration_id = 999;
    expect(assessReleaseEvidence(item, now).evidenceConsistent).toBe(false);
  });
  it("rejects conflicting duplicate smoke results", () => {
    const item = good(); item.smoke.checks.push({name: "login_entry", status: "fail", evidence_url: "https://example.com/failure"});
    expect(assessReleaseEvidence(item, now).evidenceConsistent).toBe(false);
  });
  it("actually executes the CLI and handles invalid evidence", () => {
    const run = args => spawnSync(process.execPath, ["scripts/verify-release-provenance.mjs", ...args], { cwd: process.cwd(), encoding: "utf8" });
    const missing = run([]);
    expect(missing.status).toBe(2);
    expect(missing.stderr).toContain("Usage:");
    const nonexistent = run(["/nonexistent/tpl-release-evidence.json"]);
    expect(nonexistent.status).toBe(2);
    expect(nonexistent.stderr).toContain("Unable to verify");
  });
  it("rejects GitHub CI not matching its source", () => {
    const item = good(); item.ci.sha = "b".repeat(40);
    expect(assessReleaseEvidence(item, now).evidenceConsistent).toBe(false);
  });
});
