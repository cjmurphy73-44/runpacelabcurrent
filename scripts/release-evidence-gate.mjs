// Pure, fail-closed release evidence gate. No network, tokens, or deployment actions.
// A successful PR build never proves the published Base44 checkpoint.
export function evaluateReleaseEvidence(input) {
  const blockers = [];
  const sha = value => typeof value === "string" && /^[a-f0-9]{40}$/.test(value);
  const expected = input?.expectedSha;
  if (!sha(expected)) blockers.push("Expected GitHub SHA missing or invalid");
  if (!sha(input?.mainSha) || input.mainSha !== expected) blockers.push("Protected main does not match expected SHA");
  if (!sha(input?.validatedSha) || input.validatedSha !== expected || input?.ci !== "success") {
    blockers.push("Exact-SHA CI validation not successful");
  }
  if (!sha(input?.previewSha) || input.previewSha !== expected || input?.preview !== "success") {
    blockers.push("Exact-SHA preview not successful");
  }
  if (input?.reviewApproved !== true) blockers.push("Human review approval missing");
  if (input?.publishApproved !== true) blockers.push("Explicit publish approval missing");
  if (!sha(input?.base44SourceSha) || input.base44SourceSha !== expected ||
      typeof input?.base44CheckpointId !== "string" || !input.base44CheckpointId.trim()) {
    blockers.push("Base44 checkpoint source not reconciled");
  }
  if (input?.liveVerified !== true || !sha(input?.liveSourceSha) || input.liveSourceSha !== expected) {
    blockers.push("Published source and live smoke not verified");
  }
  return { ready: blockers.length === 0, blockers, expectedSha: sha(expected) ? expected : null };
}
