export interface NormalizedTelemetryStream {
  timestamp: number; // Unix timestamp (milliseconds)
  heartRate?: number;
  velocity?: number; // m/s
  cadence?: number;
  distance?: number; // meters
  altitude?: number; // meters
  power?: number; // watts
  latitude?: number;
  longitude?: number;
}

export interface NormalizedActivity {
  id: string;
  source: 'strava';
  name: string;
  type: string; // e.g., 'Run', 'Ride', 'Swim'
  startDate: Date;
  duration: number; // in seconds
  distance: number; // in meters
  elevationGain: number; // in meters
  averageHeartRate?: number;
  maxHeartRate?: number;
  averagePower?: number; // in watts
  sufferScore?: number; // Strava's training impulse equivalent
  trainingLoad: number; // calculated training load (TRIMP or TSS based)
  streams?: NormalizedTelemetryStream[];
}

export const StravaAdapter = {
  /**
   * Normalizes raw Strava activity JSON data into our standard NormalizedActivity format.
   */
  normalizeActivity(rawActivity: any): NormalizedActivity {
    if (!rawActivity) {
      throw new Error('Raw Strava activity data is required');
    }

    const duration = rawActivity.moving_time || rawActivity.elapsed_time || 0;
    const distance = rawActivity.distance || 0;
    const averageHeartRate = rawActivity.average_heartrate;
    const sufferScore = rawActivity.suffer_score || 0;

    // Calculate a standard training load/TRIMP fallback if sufferScore is not provided
    let trainingLoad = sufferScore;
    if (!trainingLoad && averageHeartRate) {
      // Simplified TRIMP: relative effort calculation
      const hrReserve = (averageHeartRate - 60) / (190 - 60);
      const intensityFactor = Math.max(0.1, Math.min(1.0, hrReserve));
      trainingLoad = Math.round((duration / 60) * intensityFactor * 10);
    } else if (!trainingLoad) {
      // Fallback based on activity type and duration
      const intensity = rawActivity.type === 'Run' ? 8 : 4;
      trainingLoad = Math.round((duration / 3600) * intensity * 10);
    }

    return {
      id: String(rawActivity.id || ''),
      source: 'strava',
      name: rawActivity.name || 'Strava Activity',
      type: rawActivity.type || 'Run',
      startDate: rawActivity.start_date ? new Date(rawActivity.start_date) : new Date(),
      duration,
      distance,
      elevationGain: rawActivity.total_elevation_gain || 0,
      averageHeartRate,
      maxHeartRate: rawActivity.max_heartrate,
      averagePower: rawActivity.average_watts || rawActivity.weighted_average_watts,
      sufferScore,
      trainingLoad,
      streams: []
    };
  },

  /**
   * Normalizes raw Strava streams payload into our standard telemetry stream array.
   */
  normalizeStreams(rawStreams: any[], startTimestamp: number = Date.now()): NormalizedTelemetryStream[] {
    if (!Array.isArray(rawStreams)) {
      return [];
    }

    const findStreamData = (type: string): any[] | undefined => {
      const stream = rawStreams.find((s: any) => s.type === type);
      return stream ? stream.data : undefined;
    };

    const timeStream = findStreamData('time') || [];
    const heartrateStream = findStreamData('heartrate');
    const velocityStream = findStreamData('velocity_smooth');
    const cadenceStream = findStreamData('cadence');
    const distanceStream = findStreamData('distance');
    const altitudeStream = findStreamData('altitude');
    const powerStream = findStreamData('watts');
    const latlngStream = findStreamData('latlng');

    const normalizedStreams: NormalizedTelemetryStream[] = [];

    for (let i = 0; i < timeStream.length; i++) {
      const relativeSecond = timeStream[i];
      const epochTime = startTimestamp + relativeSecond * 1000;

      const datapoint: NormalizedTelemetryStream = {
        timestamp: epochTime
      };

      if (heartrateStream && heartrateStream[i] !== undefined) {
        datapoint.heartRate = heartrateStream[i];
      }
      if (velocityStream && velocityStream[i] !== undefined) {
        datapoint.velocity = velocityStream[i];
      }
      if (cadenceStream && cadenceStream[i] !== undefined) {
        datapoint.cadence = cadenceStream[i];
      }
      if (distanceStream && distanceStream[i] !== undefined) {
        datapoint.distance = distanceStream[i];
      }
      if (altitudeStream && altitudeStream[i] !== undefined) {
        datapoint.altitude = altitudeStream[i];
      }
      if (powerStream && powerStream[i] !== undefined) {
        datapoint.power = powerStream[i];
      }
      if (latlngStream && latlngStream[i] !== undefined) {
        datapoint.latitude = latlngStream[i][0];
        saved_longitude: latlngStream[i][1];
      }

      normalizedStreams.push(datapoint);
    }

    return normalizedStreams;
  }
};

// Backwards compatibility shim for workloadEngine imports
export const workloadEngine = {
  calculate: (data: any) => {
    const score = data && typeof data.score === 'number' ? data.score : 100;
    const status = data && typeof data.status === 'string' ? data.status : 'optimal';
    return { score, status };
  }
};
