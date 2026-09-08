import { NormalizedStream } from '../science/types';

export function reconcileStreams(garminStreams: NormalizedStream[], stravaStreams: NormalizedStream[]): NormalizedStream[] {
  const map = new Map<number, NormalizedStream>();

  // Strava streams first (external load priority: power, pace, moving time)
  stravaStreams.forEach(stream => {
    map.set(stream.timestamp, stream);
  });

  // Garmin streams override or merge (physiological priority: HRV, sleep)
  garminStreams.forEach(stream => {
    if (stream.type === 'HRV' || stream.type === 'SLEEP') {
      map.set(stream.timestamp, stream); // Garmin wins for physiological metrics
    } else if (!map.has(stream.timestamp)) {
      map.set(stream.timestamp, stream);
    }
  });

  return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
}
