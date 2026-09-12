import React from "react";
import LegalLayout from "@/components/layout/LegalLayout";

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" updated="12 September 2026">
      <p>
        TrainPaceLab ("we") respects your privacy. This policy explains what data we collect, why, and your rights.
      </p>
      <h2>1. Data we collect</h2>
      <ul>
        <li><strong>Account data:</strong> name, email, role, and profile settings you provide.</li>
        <li><strong>Physiology data:</strong> height, weight, age, sex, heart-rate thresholds, FTP, and injury history.</li>
        <li><strong>Training & recovery telemetry:</strong> workout sessions, streams, laps, and daily recovery
        metrics (sleep, HRV, readiness) — uploaded manually or synced from wearables.</li>
        <li><strong>Wearable connection data:</strong> OAuth tokens for Garmin, Strava, and COROS, used only to pull
        your activities on your behalf.</li>
        <li><strong>Usage data:</strong> feature interactions used to improve the Service.</li>
      </ul>
      <h2>2. How we use it</h2>
      <ul>
        <li>To compute training-load metrics (TRIMP, CTL/ATL/TSB, VDOT) and generate adaptive plans.</li>
        <li>To provide AI-coach insights and race strategy grounded in your telemetry.</li>
        <li>To process subscription payments and manage your plan.</li>
        <li>To improve our models and interface in aggregate, never by selling your data.</li>
      </ul>
      <h2>3. Sharing</h2>
      <p>
        We do not sell your data. We share only as needed to operate: Stripe for payments, our LLM providers for
        AI-coach generation (your telemetry is sent to generate responses), and wearable providers you connect.
        Coaches on the Team plan can view data for athletes assigned to their roster.
      </p>
      <h2>4. Retention</h2>
      <p>
        We keep your data for as long as your account is active. You can request deletion at any time; connection
        tokens are removed when you disconnect a wearable.
      </p>
      <h2>5. Security</h2>
      <p>
        Access to your records is scoped per user. Wearable OAuth tokens are stored encrypted at rest and accessed
        only by service-role functions performing syncs on your behalf.
      </p>
      <h2>6. Your rights</h2>
      <p>
        You may access, correct, or delete your data, and export your workout history. Contact support through the
        in-app feedback tool to exercise these rights.
      </p>
      <h2>7. Changes</h2>
      <p>We may update this policy; material changes will be communicated in-app or by email.</p>
    </LegalLayout>
  );
}