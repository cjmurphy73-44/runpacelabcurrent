import { NormalizedStream } from '../../science/types';

export const GarminAdapter = {
  parsePayload(rawGarminData: any): NormalizedStream[] {
    const streams: NormalizedStream[] = [];
    const timestamp = rawGarminData.timestamp || Date.now();

    if (rawGarminData.hrv_intervals) {
      streams.push({
        timestamp,
        type: 'HRV',
        value: rawGarminData.hrv_intervals,
        source: 'GARMIN',
      });
    }

    if (rawGarminData.sleep_stages) {
      streams.push({
        timestamp,
        type: 'SLEEP',
        value: rawGarminData.sleep_stages.score || rawGarminData.sleep_stages.duration,
        source: 'GARMIN',
      });
    }

    return streams;
  }
};
