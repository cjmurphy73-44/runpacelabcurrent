import { useState, useMemo } from 'react';
import { 
  IntervalFormat, 
  NorwegianPrescription, 
  DecouplingResult, 
  TelemetryInputs, 
  calculateNorwegianPrescription, 
  calculateDecoupling 
} from '../science/norwegianEngine';

export interface UseNorwegianWorkoutsOptions {
  initialVdot?: number;
  initialFormat?: IntervalFormat;
}

export function useNorwegianWorkouts(options: UseNorwegianWorkoutsOptions = {}) {
  const [vdot, setVdot] = useState<number>(options.initialVdot ?? 55);
  const [format, setFormat] = useState<IntervalFormat>(options.initialFormat ?? '5x2000');
  
  const [telemetryInputs, setTelemetryInputs] = useState<TelemetryInputs>({
    firstHalfAvgSpeed: 14.2, // km/h
    firstHalfAvgHr: 152,     // bpm
    secondHalfAvgSpeed: 14.1,// km/h
    secondHalfAvgHr: 156,    // bpm
  });

  const prescription: NorwegianPrescription = useMemo(() => {
    return calculateNorwegianPrescription(vdot, format);
  }, [vdot, format]);

  const decouplingResult: DecouplingResult = useMemo(() => {
    return calculateDecoupling(telemetryInputs);
  }, [telemetryInputs]);

  const updateTelemetry = (updates: Partial<TelemetryInputs>) => {
    setTelemetryInputs(prev => ({ ...prev, ...updates }));
  };

  return {
    vdot,
    setVdot,
    format,
    setFormat,
    prescription,
    decouplingResult,
    telemetryInputs,
    updateTelemetry,
  };
}
