import React, { useState } from "react";
import { cyclingPowerScenario } from "@/lib/cyclingPowerScenario";

// This is a user-controlled counterfactual, not a reconstruction of actual watts.
export default function CyclingPowerScenario({ workout, athlete }) {
  const [bikeMass, setBikeMass] = useState(10);
  const [grade, setGrade] = useState(0);
  const [wind, setWind] = useState(0);
  const [cda, setCda] = useState(0.32);
  const mass = Number(athlete?.weight_kg);
  const minutes = Number(workout?.duration_seconds) > 0
    ? Number(workout.duration_seconds) / 60 : Number(workout?.duration_minutes);
  const speed = minutes > 0 ? Number(workout?.distance_km) * 60 / minutes : NaN;
  if (workout?.sport !== "cycling" || Number(workout?.avg_power) > 0) return null;
  const available = Number.isFinite(mass) && mass >= 25 && mass <= 250
    && Number.isFinite(speed) && speed > 0;
  const estimate = available
    ? cyclingPowerScenario({
      speedKmh: speed, riderMassKg: mass, bikeMassKg: bikeMass,
      cda, headwindKmh: wind, gradePercent: grade,
    }) : null;
  return (
    <section aria-label="Cycling power scenario" className="rounded-lg border border-border/60 bg-secondary/20 p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">Cycling power scenario</h4>
        <span className="text-[11px] rounded border border-border px-2 py-1">Modelled · not measured</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Illustrative steady-speed watts at the ride's overall average speed, with adjustable
        flat-road/wind/position assumptions. Not the ride's measured or actual average power,
        and not suitable for power training zones, TSS or FTP calibration.
      </p>
      {!available ? (
        <p className="text-xs text-muted-foreground">A valid athlete weight, ride distance and duration are required for this scenario.</p>
      ) : (
        <>
          <p className="text-lg font-mono font-semibold">
            {estimate ? `${estimate.watts} W` : "—"} <span className="text-xs text-muted-foreground font-sans">scenario only</span>
          </p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <label className="space-y-1">Bike + equipment (kg)
              <input aria-label="Bike and equipment mass in kg" type="number" min="3" max="35" step="1" value={bikeMass}
                onChange={e => setBikeMass(Number(e.target.value))} className="w-full rounded border border-border bg-background p-2" />
            </label>
            <label className="space-y-1">Road grade (%)
              <input aria-label="Road grade percent" type="number" min="-20" max="20" step="0.5" value={grade}
                onChange={e => setGrade(Number(e.target.value))} className="w-full rounded border border-border bg-background p-2" />
            </label>
            <label className="space-y-1">Headwind (km/h)
              <input aria-label="Headwind in kilometres per hour" type="number" min="-45" max="45" step="1" value={wind}
                onChange={e => setWind(Number(e.target.value))} className="w-full rounded border border-border bg-background p-2" />
            </label>
            <label className="space-y-1">Drag area CdA (m²)
              <input aria-label="Aerodynamic drag area" type="number" min="0.15" max="0.9" step="0.01" value={cda}
                onChange={e => setCda(Number(e.target.value))} className="w-full rounded border border-border bg-background p-2" />
            </label>
          </div>
          <p className="text-[11px] text-muted-foreground">Assumptions: total mass includes athlete ({mass} kg); air density 1.225 kg/m³, Crr 0.005, drivetrain efficiency 97.5%. Stops, acceleration, drafting and changing terrain are not modelled. Adjust inputs to examine sensitivity.</p>
        </>
      )}
      <p className="text-xs text-muted-foreground">FTP: unavailable from this recording without calibrated power or a validated power-duration test. An unverified scenario is never saved as FTP.</p>
    </section>
  );
}
