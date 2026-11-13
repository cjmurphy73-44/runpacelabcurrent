// UI-only entitlement projection. Backend authorization remains authoritative.
// Missing, malformed, canceled and unpaid records must never unlock features.
export function resolveSubscriptionEntitlement(rows: unknown): { plan: string; status: string } {
  const first = Array.isArray(rows) ? rows[0] : null;
  if (!first || typeof first !== "object") return { plan: "free", status: "unknown" };
  const row = first as { plan?: unknown; status?: unknown };
  const status = typeof row.status === "string" ? row.status : "unknown";
  const allowedPlan = ["pro", "unlimited", "coach_pro", "team"].includes(String(row.plan));
  if (!allowedPlan || !["active", "trialing"].includes(status)) {
    return { plan: "free", status };
  }
  return { plan: String(row.plan), status };
}
