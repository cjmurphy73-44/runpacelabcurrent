// src/lib/telemetry/TelemetryParser.ts
// Frontend mirror of the shared backend telemetry parser (base44/shared/telemetryParser.ts),
// so client-side ingestion flows (e.g. BulkWorkoutImport pre-validation) reuse the exact same
// sanitization + dedup rules as the server-side bulk-ingest pipeline — one source of truth.

export {
  sanitizeSession as sanitize,
  isDuplicateSession as isDuplicate,
  VALID_SPORTS,
  MAX_DURATION_S,
  MIN_DURATION_S,
  TelemetryParser as default,
} from "../../../base44/shared/telemetryParser";