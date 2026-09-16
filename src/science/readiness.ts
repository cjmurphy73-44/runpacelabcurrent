// src/science/readiness.ts
// Frontend entry point for the holistic readiness engine. The authoritative pure logic
// lives in base44/shared/readiness.ts (imported by backend ingest functions too), so the
// computation is identical server- and client-side. Re-exported here for UI consumption.
export {
  computeHolisticReadiness,
  computeBaseline,
} from "../../../base44/shared/readiness.ts";
export type { RecoverySignals, RecoveryBaseline } from "../../../base44/shared/readiness.ts";