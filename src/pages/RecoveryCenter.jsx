import React from "react";
import PageShell from "@/components/layout/PageShell";
import SectionHeading from "@/components/layout/SectionHeading";
import RecoveryCenterView from "@/components/RecoveryCenterView";
import { HeartPulse } from "lucide-react";

export default function RecoveryCenter() {
  return (
    <PageShell maxWidth="max-w-5xl">
      <SectionHeading
        title="Recovery Center"
        description="Log and review your daily recovery metrics — HRV, sleep, resting heart rate and readiness."
        icon={HeartPulse}
      />
      <RecoveryCenterView />
    </PageShell>
  );
}