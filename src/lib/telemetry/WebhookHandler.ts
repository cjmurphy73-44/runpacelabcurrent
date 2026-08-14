export interface WebhookPayload {
  [key: string]: any;
}

export interface NormalizedSession {
  provider: string;
  externalId: string;
  rawPayload: WebhookPayload;
  normalizedAt: string;
  startTime: string;
  date?: string;
  durationSeconds: number;
  sportType: string;
  tss?: number;
}

export function sanitizeSession(session: NormalizedSession) {
  const dateStr = session.date || session.startTime;
  const parsed = Date.parse(dateStr);

  console.log("DEBUG sanitizeSession:", { session, date: dateStr, parsed });

  if (isNaN(parsed)) {
    return null;
  }

  return {
    ...session,
    date: dateStr,
  };
}

export class WebhookHandler {
  static handle(provider: string, payload: WebhookPayload): NormalizedSession | null {
    let externalId = '';
    let durationSeconds = 0;
    let sportType = 'running';
    let startTime = new Date().toISOString();

    if (provider === 'strava') {
      externalId = String(payload.object_id || payload.id || '');
      durationSeconds = payload.elapsed_time || payload.duration_seconds || 0;
      sportType = payload.type || 'running';
      if (payload.event_time) {
        startTime = new Date(payload.event_time * 1000).toISOString();
      } else if (payload.date) {
        startTime = new Date(payload.date).toISOString();
      }
    } else if (provider === 'garmin') {
      externalId = String(payload.id || payload.externalId || '');
      durationSeconds = payload.durationSeconds || payload.duration_seconds || 0;
      sportType = payload.sportType || 'running';
      if (payload.startTime) {
        startTime = new Date(payload.startTime).toISOString();
      }
    }

    const session: NormalizedSession = {
      provider,
      externalId,
      rawPayload: payload,
      normalizedAt: new Date().toISOString(),
      startTime,
      date: payload.date || startTime,
      durationSeconds,
      sportType,
      tss: payload.tss,
    };

    return sanitizeSession(session);
  }
}
