import React from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

export default function WebhookSetupGuides({ webhookUrl, apiKey }) {
  const url = webhookUrl || "https://<your-app>/api/v1/functions/workoutWebhook?key=YOUR_API_KEY";
  const jsonShape = `{
  "date": "YYYY-MM-DD",
  "sport": "running",
  "duration_seconds": 3600,
  "distance_km": 8.5,
  "avg_hr": 150,
  "max_hr": 175
}`;

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="health">
        <AccordionTrigger>Health Auto Export (Apple Health)</AccordionTrigger>
        <AccordionContent className="space-y-2 text-sm">
          <p>1. On your iPhone, open Health Auto Export (or an iOS Shortcut that reads Health workout data).</p>
          <p>2. Add an HTTP/Webhook destination: method <code className="font-mono">POST</code>, URL <code className="font-mono">{url}</code>, header <code className="font-mono">Content-Type: application/json</code>.</p>
          <p>3. Map your workout to this JSON shape:</p>
          <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">{jsonShape}</pre>
          <p>4. Trigger on workout save. Accepted activities are saved to your log and CTL/ATL/TSB recompute automatically.</p>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="strava">
        <AccordionTrigger>Strava webhooks</AccordionTrigger>
        <AccordionContent className="space-y-2 text-sm">
          <p>1. Register an app at <code className="font-mono">developers.strava.com</code>; set its Callback domain to this app's domain.</p>
          <p>2. Create a push subscription: <code className="font-mono">POST https://www.strava.com/api/v3/push_subscriptions</code> with <code className="font-mono">callback_url</code> = your Webhook URL and <code className="font-mono">verify_token</code> = your API key.</p>
          <p>3. Strava verifies the subscription with a GET <code className="font-mono">hub.challenge</code> — this endpoint echoes it automatically.</p>
          <p className="text-xs text-amber-600">
            Note: Strava webhooks deliver activity references, not full data. For full per-activity import via Strava OAuth (a follow-up), use Strava's GPX/FIT export in the Bulk File Upload tab in the meantime.
          </p>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="coros">
        <AccordionTrigger>COROS</AccordionTrigger>
        <AccordionContent className="space-y-2 text-sm">
          <p>1. For fully automated COROS sync, use the "Connect COROS Account" button on the Settings page (OAuth).</p>
          <p>2. To use this generic webhook instead, POST the workout summary JSON (see the Health Auto Export shape above) to your Webhook URL.</p>
          <p>3. Or export <code className="font-mono">.fit</code> files (Profile → Workout → Export Data) and drop them into the Bulk File Upload tab.</p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}