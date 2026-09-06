import { create } from 'zustand';

export interface WorkoutTelemetry {
  id: string;
  date: string;
  modality: 'running' | 'cycling' | 'swimming' | 'rowing';
  durationMinutes: number;
  averageHr: number;
  maxHr: number;
  perceivedExertion: number;
  mechanicalLoad: number;
  cardioLoad: number;
}

export interface BiometricEntry {
  date: string;
  restingHeartRate: number;
  hrvMs: number;
  sleepScore: number;
  subjectiveSoreness: number;
}

interface TelemetryState {
  workouts: WorkoutTelemetry[];
  biometrics: BiometricEntry[];
  addWorkout: (workout: Omit<WorkoutTelemetry, 'id'>) => void;
  addBiometrics: (biometrics: BiometricEntry) => void;
}

export const useTelemetryStore = create<TelemetryState>((set) => ({
  workouts: [
    {
      id: 'w-1',
      date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
      modality: 'running',
      durationMinutes: 50,
      averageHr: 155,
      maxHr: 178,
      perceivedExertion: 7,
      mechanicalLoad: 450,
      cardioLoad: 380
    },
    {
      id: 'w-2',
      date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      modality: 'cycling',
      durationMinutes: 75,
      averageHr: 142,
      maxHr: 168,
      perceivedExertion: 6,
      mechanicalLoad: 120,
      cardioLoad: 410
    }
  ],
  biometrics: [
    {
      date: new Date().toISOString().split('T')[0],
      restingHeartRate: 52,
      hrvMs: 74,
      sleepScore: 86,
      subjectiveSoreness: 2
    }
  ],
  addWorkout: (workout) =>
    set((state) => ({
      workouts: [
        ...state.workouts,
        { ...workout, id: `w-${Date.now()}` }
      ]
    })),
  addBiometrics: (biometrics) =>
    set((state) => ({
      biometrics: [...state.biometrics, biometrics]
    }))
}));
