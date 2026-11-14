import React, { useMemo } from 'react';
import { useNorwegianWorkouts } from '@/hooks/useNorwegianWorkouts';
import { calculateNorwegianPrescription, type IntervalFormat } from '@/science/norwegianEngine';

export interface NorwegianIntervalPlannerProps { initialVdot?: number; }

// No default athlete VDOT, invented telemetry or unearned decoupling score.
export const NorwegianIntervalPlanner: React.FC<NorwegianIntervalPlannerProps> = ({ initialVdot }) => {
  const { vdot, setVdot, format, setFormat } = useNorwegianWorkouts({ initialVdot });
  const valid = typeof vdot === 'number' && Number.isFinite(vdot) && vdot > 0;
  const prescription = useMemo(
    () => valid ? calculateNorwegianPrescription(vdot, format as IntervalFormat) : null,
    [valid, vdot, format],
  );
  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h2 className="text-lg font-semibold">Norwegian interval planner</h2>
      <label htmlFor="norwegian-vdot" className="block text-sm">VDOT (from a race result or entered manually)</label>
      <input id="norwegian-vdot" type="number" min="1" step="0.1" value={vdot ?? ''}
        onChange={e => setVdot(e.target.value === '' ? null : Number(e.target.value))}
        className="rounded border border-border bg-background p-2" />
      {!prescription ? <p className="text-sm text-muted-foreground">Add a valid VDOT to calculate a pace prescription. No athlete baseline is assumed.</p> : (
        <>
          <label htmlFor="norwegian-format" className="block text-sm">Workout format</label>
          <select id="norwegian-format" value={format} onChange={e => setFormat(e.target.value)}
            className="rounded border border-border bg-background p-2">
            <option value="10x1000">10 × 1000 m</option>
            <option value="5x2000">5 × 2000 m</option>
            <option value="4x3000">4 × 3000 m</option>
          </select>
          <p className="text-sm">Calculated threshold-based target: <strong>{prescription.formattedPace}</strong></p>
          <p className="text-sm">Work volume: {prescription.totalWorkMeters / 1000} km. Recovery: {prescription.recoverySeconds} s.</p>
          <p className="text-xs text-muted-foreground">Model-derived guidance, not measured blood lactate or cardiac decoupling.</p>
        </>
      )}
    </section>
  );
};
