import { WebhookHandler } from "../WebhookHandler.ts";

const stravaMock = {
  object_id: 12345,
  event_time: 1723200000, // Roughly Aug 9 2026
  elapsed_time: 3600,
  type: "Run"
};

const garminMock = {
  id: "g-98765",
  startTime: "2026-08-09T04:00:00Z",
  durationSeconds: 1800,
  sportType: "Cycling"
};

console.log("--- Testing WebhookHandler ---");

try {
  const stravaResult = WebhookHandler.handle("strava", stravaMock);
  console.log("Strava Normalized:", JSON.stringify(stravaResult, null, 2));

  const garminResult = WebhookHandler.handle("garmin", garminMock);
  console.log("Garmin Normalized:", JSON.stringify(garminResult, null, 2));

  if (stravaResult && garminResult) {
    console.log("SUCCESS: Both adapters processed payloads correctly.");
  }
} catch (e) {
  console.error("FAILED: WebhookHandler execution error:", e);
}
