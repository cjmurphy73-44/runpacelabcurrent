import { NormalizedStream } from '../../science/types';

export const StravaAdapter = {
  parsePayload(rawStravaData: any): NormalizedStream[] {
    const streams: NormalizedStream[] = [];
    const timestamp = rawStravaData.start_date ? new Date(rawStravaData.start_date).getTime() : Date.now();

    if (rawStravaData.moving_time) {
      streams.push({
        timestamp,
        type: 'PACE',
        value: rawStravaData.moving_time,
        source: 'STRAVA',
      });
    }

    if (rawStravaData.average_watts) {
      streams.push({
        timestamp,
        type: 'POWER',
        value: rawStravaData.average_watts,
        source: 'STRAVA',
      });
    }

    return streams;
  }
};
