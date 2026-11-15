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
        <details className="mt-8 rounded-lg border border-border bg-card p-4 text-sm">
          <summary className="cursor-pointer font-semibold">Science and methodology: how these numbers are calculated</summary>
          <div className="mt-4 space-y-3 text-muted-foreground">
            <p>Training load may come from a verified heart-rate recording or a labelled summary estimate. Missing recordings limit what can be calculated.</p>
            <p>CTL and ATL are smoothed load histories using 42-day and 7-day time constants. TSB is their difference. These are model outputs, not direct measurements of fitness, fatigue or injury risk.</p>
            <p>TRIMP and TSS have different units and must not be combined without validated conversion. Forecasts are scenarios, not guaranteed performance predictions.</p>
            <p>Automatic plan changes require verified history, individual context and athlete or authorised coach review.</p>
            <p>Research: <a className="underline" href="https://doi.org/10.1152/jappl.1990.69.3.1171" target="_blank" rel="noopener noreferrer">Morton et al. (1990)</a>; <a className="underline" href="https://doi.org/10.1007/s40279-014-0253-z" target="_blank" rel="noopener noreferrer">Halson (2014)</a>; <a className="underline" href="https://pubmed.ncbi.nlm.nih.gov/32502973/" target="_blank" rel="noopener noreferrer">ACWR limitations (2020)</a>.</p>
          </div>
        </details>
      </PageShell>
    </FitnessProvider>
  );
}