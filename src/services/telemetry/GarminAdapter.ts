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

    if (Array.isArray(rawGarminData.samples)) {
      rawGarminData.samples.forEach((sample: any, idx: number) => {
        const sampleTime = sample.timestamp || timestamp + idx * 1000;
        if (sample.heartRate !== undefined && sample.heartRate !== null) {
          streams.push({ timestamp: sampleTime, type: 'HEART_RATE', value: sample.heartRate, source: 'GARMIN' });
        }
        if (sample.power !== undefined && sample.power !== null) {
          streams.push({ timestamp: sampleTime, type: 'POWER', value: sample.power, source: 'GARMIN' });
        }
        if (sample.cadence !== undefined && sample.cadence !== null) {
          streams.push({ timestamp: sampleTime, type: 'CADENCE', value: sample.cadence, source: 'GARMIN' });
        }
        if (sample.speed !== undefined && sample.speed !== null) {
          streams.push({ timestamp: sampleTime, type: 'SPEED', value: sample.speed, source: 'GARMIN' });
        }
      });
    }

    return streams;
  },

  normalizeActivity(raw: any) {
    return {
      sessionId: raw.activityId || raw.sessionId,
      date: raw.startTimeLocal || raw.date,
      sport: raw.activityType || 'running',
      durationMinutes: (raw.durationInSeconds || 0) / 60,
      distanceMeters: raw.distanceInMeters || 0,
      dataStreams: this.parsePayload(raw)
    };
  },

  normalizeStreams(streams: any[]) {
    return streams.flatMap(s => this.parsePayload(s));
  }
};
