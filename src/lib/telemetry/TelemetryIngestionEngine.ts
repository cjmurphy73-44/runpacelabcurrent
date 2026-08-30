import TelemetryParser from './TelemetryParser';

export interface TelemetryFilePayload {
  filename: string;
  buffer?: ArrayBuffer | string;
}

export function dominantFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return ext;
}

export function reconcileStreams(parsedStreams: any[]) {
  return {
    combinedStreams: parsedStreams.map(p => p.streams),
    sourceCount: parsedStreams.length,
  };
}

export class TelemetryIngestionEngine {
  public async processWorkout(workout: { dataStreams?: TelemetryFilePayload[]; [key: string]: any }) {
    const streams = workout.dataStreams || [];
    const parsedStreams = streams.map(file => {
      const format = dominantFileType(file.filename);
      // Use TelemetryParser.parse if available, otherwise fallback to sanitizing or passing raw buffer
      const parseFn = (TelemetryParser as any)?.parse || ((buf: any) => ({ raw: buf }));
      const parsedData = parseFn(file.buffer || '', format);
      return {
        format,
        streams: parsedData,
      };
    });

    const reconciled = reconcileStreams(parsedStreams);
    const dominantFormat = streams.length > 0 ? dominantFileType(streams[0].filename) : 'fit';

    return {
      reconciledStream: reconciled.combinedStreams,
      dominantSourceFormat: dominantFormat,
    };
  }

  public static async ingestAndReconcile(files: TelemetryFilePayload[]) {
    const engine = new TelemetryIngestionEngine();
    return engine.processWorkout({ dataStreams: files });
  }
}
