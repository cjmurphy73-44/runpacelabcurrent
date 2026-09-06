import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageShell from "@/components/layout/PageShell";
import SectionHeading from "@/components/layout/SectionHeading";
import RecoveryCenterView from "@/components/RecoveryCenterView";
import { FitnessProvider } from "@/context/FitnessContext";
import { HeartPulse, Loader2 } from "lucide-react";

export default function RecoveryCenter() {
  const [athlete, setAthlete] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.functions.invoke("fetchAthleteProfile", {});
        setAthlete(res.data?.athlete || null);
      } catch {
        setAthlete(null);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  if (!athlete) {
    return (
      <PageShell maxWidth="max-w-5xl">
        <SectionHeading
          title="Recovery Center"
          description="Log and review your daily recovery metrics — HRV, sleep, resting heart rate and readiness."
          icon={HeartPulse}
        />
        <p className="text-sm text-muted-foreground">Create your athlete profile on the dashboard first, then return here.</p>
      </PageShell>
    );
  }

  return (
    <FitnessProvider athleteId={athlete.id}>
      <PageShell maxWidth="max-w-5xl">
        <SectionHeading
          title="Recovery Center"
          description="Log and review your daily recovery metrics — HRV, sleep, resting heart rate and readiness."
          icon={HeartPulse}
        />
        <RecoveryCenterView athleteId={athlete.id} />
      </PageShell>
    </FitnessProvider>
  );
}