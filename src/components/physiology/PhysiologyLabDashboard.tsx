import React, { useState, useMemo } from 'react';
import { OdeFitnessFatigueChart, OdeDataPoint } from './OdeFitnessFatigueChart';
import { calculateFitnessFatigueOde } from '../../science';

interface DailyLoadInput {
  date: string;
  tss: number; // or daily TRIMP
}

interface PhysiologyLabDashboardProps {
  historicalLoads: DailyLoadInput[]; // Raw daily training load timeline
  initialFitness?: number;
  initialFatigue?: number;
}

export const PhysiologyLabDashboard: React.FC<PhysiologyLabDashboardProps> = ({
  historicalLoads = [],
  initialFitness = 0,
  initialFatigue = 0,
}) => {
  // Interactive decay constants controlled by the chart's UI sliders
  const [tau1, setTau1] = useState<number>(42); // Fitness time constant
  const [tau2, setTau2] = useState<number>(7);  // Fatigue time constant

  // Gain constants (standard Banister coefficients)
  const k1 = 1.0;
  const k2 = 2.0;

  // Dynamically compute the ODE state vector timeline whenever loads or Taus change
  const odeData: OdeDataPoint[] = useMemo(() => {
    // Convert inputs to match calculateFitnessFatigueOde expected structure
    const history = historicalLoads.map((l) => ({
      date: l.date,
      trimp: l.tss,
    }));

    const result = calculateFitnessFatigueOde(history, {
      tau1,
      tau2,
      k1: 1.0,
      k2: 1.5,
      baselinePerformance: 50,
    });

    return result.map((r) => ({
      date: r.date,
      fitness: r.fitness,
      fatigue: r.fatigue,
      form: r.form,
      trimp: r.load,
    }));
  }, [historicalLoads, tau1, tau2]);

  // Handle slider adjustments from the chart component
  const handleTauChange = (newTau1: number, newTau2: number) => {
    setTau1(newTau1);
    setTau2(newTau2);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold tracking-tight text-white font-mono">
          Physiology Lab & Performance Modeling
        </h2>
        <p className="text-sm text-slate-400">
          First-principles differential equation simulation of athlete adaptation kinetics.
        </p>
      </div>

      {/* Render the interactive ODE chart component */}
      <OdeFitnessFatigueChart
        data={odeData}
        tau1={tau1}
        tau2={tau2}
        onTauChange={handleTauChange}
        isLoading={false}
      />
    </div>
  );
};

export default PhysiologyLabDashboard;
