import React from "react";
import PageShell from "@/components/layout/PageShell";
import { useAthlete } from "@/hooks/useAthlete";
import { FitnessProvider } from "@/context/FitnessContext";
import PhysiologyLab from "@/components/dashboard/PhysiologyLab";
import { FlaskConical } from "lucide-react";

export default function Physiology() {
  const { athlete, loading } = useAthlete();

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground">Loading…</div>;
  }
  if (!athlete) {
    return <div className="text-center py-20 text-muted-foreground">Set up your athlete profile to view physiology metrics.</div>;
  }

  return (
    <FitnessProvider athleteId={athlete.id}>
      <PageShell
        title="Physiology Lab"
        description="Your form, training-load balance, threshold trends and baseline benchmarks."
        icon={FlaskConical}
        maxWidth="max-w-6xl"
      >
        <PhysiologyLab athlete={athlete} />
      </PageShell>
    </FitnessProvider>
  );
}