#!/bin/bash
BASE_URL="http://localhost:7861/api/functions"

echo "=== Testing VDOT Engine ==="
curl -s -X POST "$BASE_URL/calculateVDOT" \
  -H "Content-Type: application/json" \
  -d '{"timeSeconds": 1200, "distanceMeters": 5000}'
echo -e "\n"

echo "=== Testing AI Deep Dive (Unauthenticated Check) ==="
curl -s -X POST "$BASE_URL/aiDeepDive" \
  -H "Content-Type: application/json" \
  -d '{"activityId": "test-123"}'
echo -e "\n"

echo "=== Testing Coach Briefing (Unauthenticated Check) ==="
curl -s -X POST "$BASE_URL/coachBriefing" \
  -H "Content-Type: application/json" \
  -d '{"athleteId": "athlete-456"}'
echo -e "\n"

echo "=== Testing Generate Training Plan (Unauthenticated Check) ==="
curl -s -X POST "$BASE_URL/generateTrainingPlan" \
  -H "Content-Type: application/json" \
  -d '{"goalDistance": "Marathon", "targetWeeks": 16}'
echo -e "\n"
