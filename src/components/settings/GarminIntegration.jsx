import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import GarminConnectionCard from "./GarminConnectionCard";

// Garmin lives in the same "Connected Apps" list as COROS and Strava, so the
// surrounding copy stays minimal and the card owns the status detail.
export function GarminIntegration({ athleteId }) {
  return (
    <Card className="border border-border">
      <CardContent className="p-4">
        <GarminConnectionCard athleteId={athleteId} />
      </CardContent>
    </Card>
  );
}

export default GarminIntegration;