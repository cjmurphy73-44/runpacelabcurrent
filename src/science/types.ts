export interface NormalizedStream {
  type?: string;
  timestamp: number;
  heartRate?: number[];
  power?: number[];
  cadence?: number[];
  pace?: number[];
  altitude?: number[];
  [key: string]: any;
}

export interface BanisterLoadInput {
  date: string;
  durationMinutes: number;
  trimp: number;
  tss?: number;
}

export interface FitnessSummary {
  ctl: number;
  atl: number;
  tsb: number;
}

export interface WorkloadMetricData {
  ctl: number;
  atl: number;
  tsb: number;
}
