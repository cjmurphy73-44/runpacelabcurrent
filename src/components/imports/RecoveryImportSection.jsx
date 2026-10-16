import React from "react";
import { FitnessProvider } from "@/context/FitnessContext";
import { Card, CardContent } from "@/components/ui/card";
import BiometricLogForm from "@/components/dashboard/BiometricLogForm";
import RecoveryCsvDropzone from "@/components/dashboard/RecoveryCsvDropzone";

// Self-contained recovery import block for the Imports page. Wraps the
// fitness-context-dependent recovery widgets in a FitnessProvider so the
// Imports page itself doesn't need to provide one.
export default function RecoveryImportSection({ athleteId }) {
  return (
    <FitnessProvider athleteId={athleteId}>
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-5">
            <BiometricLogForm athleteId={athleteId} />
          </CardContent>
        </Card>
        <div className="space-y-1">
          <p className="text-sm font-medium">Bulk import (CSV / JSON)</p>
          <RecoveryCsvDropzone athleteId={athleteId} />
        </div>
      </div>
    </FitnessProvider>
  );
}