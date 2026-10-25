import { NormalizedStream } from '../science/types';

export function reconcileStreams(primary: NormalizedStream[], secondary: NormalizedStream[]): NormalizedStream[] {
  const map = new Map<number, NormalizedStream>();
  
  for (const stream of secondary) {
    if (typeof stream.timestamp === 'number') {
      map.set(stream.timestamp, stream);
    }
  }

  for (const stream of primary) {
    if (typeof stream.timestamp === 'number') {
      if (stream.type === 'HRV' || stream.type === 'SLEEP') {
        map.set(stream.timestamp, stream);
      } else if (!map.has(stream.timestamp)) {
        map.set(stream.timestamp, stream);
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
}
