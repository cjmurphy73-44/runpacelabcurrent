import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Webhook } from "lucide-react";

export default function DataConnectionsSettings() {
  const endpoint = "https://api.runpacelogic.com/ingest/v1/webhook";
  const apiKey = "rpl_user_..." + Math.random().toString(36).substr(2, 6);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="w-5 h-5 text-primary" /> Data Connections
        </CardTitle>
        <CardDescription>Configure your personal data ingestion settings.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Personal Ingestion Endpoint</label>
          <code className="block mt-1 p-2 bg-muted rounded text-xs font-mono break-all">{endpoint}</code>
        </div>
        <div>
          <label className="text-sm font-medium">Unique Token</label>
          <code className="block mt-1 p-2 bg-muted rounded text-xs font-mono">{apiKey}</code>
        </div>
        <div className="pt-4 border-t border-border">
          <h4 className="text-sm font-semibold">How to push workouts:</h4>
          <p className="text-sm text-muted-foreground mt-2">
            Use any tool (cURL, Zapier, Make) to POST a JSON workout summary to your endpoint with an `Authorization: Bearer YOUR_TOKEN` header.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
