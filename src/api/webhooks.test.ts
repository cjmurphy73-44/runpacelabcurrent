import { describe, expect, it } from 'vitest';
import {
  verifyStravaWebhook,
  processStravaWebhook,
  processGarminWebhook,
} from './webhooks';
import { StreamSourcePriority, ExistingActivity } from '../services/deduplication';

describe('Webhook Ingestion API Handlers', () => {
  describe('verifyStravaWebhook', () => {
    it('returns 200 with challenge on valid token match', () => {
      const query = {
        'hub.mode': 'subscribe',
        'hub.challenge': 'challenge_token_123',
        'hub.verify_token': 'MY_SECRET_TOKEN',
      };

      const res = verifyStravaWebhook(query, 'MY_SECRET_TOKEN');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ 'hub.challenge': 'challenge_token_123' });
    });

    it('returns 403 on invalid token match', () => {
      const query = {
        'hub.mode': 'subscribe',
        'hub.challenge': 'challenge_token_123',
        'hub.verify_token': 'WRONG_TOKEN',
      };

      const res = verifyStravaWebhook(query, 'MY_SECRET_TOKEN');

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('processStravaWebhook', () => {
    it('normalizes valid Strava payload and returns CREATE_NEW for unique run', () => {
      const payload = {
        object_id: 884848,
        owner_id: 'user_456',
        event_time: 1723200000,
        elapsed_time: 3600,
        type: 'running',
        date: '2026-08-09T10:40:00.000Z',
        duration_seconds: 3600,
        distance_km: 10,
      };

      const res = processStravaWebhook(payload);

      expect(res.success).toBe(true);
      expect(res.session?.provider).toBe('strava');
      expect(res.session?.externalId).toBe('884848');
      expect(res.deduplication?.action).toBe('CREATE_NEW');
    });

    it('rejects duplicate Strava event when exact match exists', () => {
      const existing: ExistingActivity[] = [
        {
          id: 'existing-act-1',
          userId: 'user_456',
          externalActivityId: '884848',
          startTime: new Date('2026-08-09T10:40:00.000Z'),
          distanceMeters: 10000,
          durationSeconds: 3600,
          streamSourcePriority: StreamSourcePriority.FITNESS_HUB,
        },
      ];

      const payload = {
        object_id: 884848,
        owner_id: 'user_456',
        event_time: 1723200000,
        elapsed_time: 3600,
        type: 'running',
        date: '2026-08-09T10:40:00.000Z',
        duration_seconds: 3600,
        distance_km: 10,
      };

      const res = processStravaWebhook(payload, existing);

      expect(res.success).toBe(true);
      expect(res.deduplication?.action).toBe('REJECT_DUPLICATE');
      expect(res.deduplication?.existingActivityId).toBe('existing-act-1');
    });
  });

  describe('processGarminWebhook', () => {
    it('processes Garmin activity with direct wearable priority', () => {
      const payload = {
        id: 'garmin-777',
        userId: 'user_123',
        startTime: '2026-08-09T04:00:00.000Z',
        durationSeconds: 1800,
        sportType: 'running',
        distanceMeters: 5000,
        date: '2026-08-09T04:00:00.000Z',
      };

      const res = processGarminWebhook(payload);

      expect(res.success).toBe(true);
      expect(res.session?.provider).toBe('garmin');
      expect(res.session?.externalId).toBe('garmin-777');
      expect(res.deduplication?.action).toBe('CREATE_NEW');
    });
  });
});
