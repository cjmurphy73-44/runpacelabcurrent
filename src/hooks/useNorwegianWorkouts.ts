import { useState } from 'react';

export function useNorwegianWorkouts(options?: { initialVdot?: number }) {
  const [vdot, setVdot] = useState(options?.initialVdot ?? 55);
  const [format, setFormat] = useState('1000m');
  const [prescription, setPrescription] = useState<any>(null);
  const [decouplingResult, setDecouplingResult] = useState<any>(null);
  const [telemetryInputs, setTelemetryInputs] = useState<any>(null);

  return {
    vdot,
    setVdot,
    format,
    setFormat,
    prescription,
    setPrescription,
    decouplingResult,
    setDecouplingResult,
    telemetryInputs,
    setTelemetryInputs,
    loading: false
  };
}
