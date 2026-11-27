import { describe, expect, it } from 'vitest';
import {
  splitMetric, splitMetricKind, splitMetricLabel, splitDistanceText, splitDurationText,
} from '../../lib/splitMetrics';

const ALL_STORED_SPORTS = [
  'running', 'trail_running', 'walking', 'hiking', 'cycling', 'mountain_biking',
  'e_bike', 'swimming', 'rowing', 'kayaking', 'cross_country_skiing',
  'downhill_skiing', 'snowboarding', 'strength', 'yoga', 'elliptical',
  'stair_climbing', 'tennis', 'soccer', 'climbing', 'boxing', 'triathlon', 'other',
];

describe('sport-aware split presentation', () => {
  it('covers every persisted workout sport with explicit display semantics', () => {
    expect(ALL_STORED_SPORTS).toHaveLength(23);
    for (const sport of ALL_STORED_SPORTS) {
      expect(['pace_km', 'pace_100m', 'pace_500m', 'speed_kmh', 'not_applicable'])
        .toContain(splitMetricKind(sport));
      expect(splitMetricLabel(sport)).not.toBe('');
      expect(splitMetric({ duration_s: 600, distance_km: 1, avg_speed: 1 }, sport).text).toBeTruthy();
    }
  });
  it.each(['running', 'trail_running', 'walking', 'hiking'])('%s shows running-style elapsed pace per km', sport => {
    expect(splitMetric({ duration_s: 300, distance_km: 1, avg_speed: 9 }, sport))
      .toMatchObject({ text: '5:00 /km', source: 'elapsed_average' });
  });
  it.each(['cycling', 'mountain_biking', 'e_bike', 'cross_country_skiing', 'downhill_skiing', 'snowboarding'])
    ('%s uses elapsed speed in km/h, not raw FIT metres per second', sport => {
      expect(splitMetric({ duration_s: 1800, distance_km: 12, avg_speed: 99 }, sport))
        .toMatchObject({ text: '24.0 km/h', source: 'elapsed_average' });
    });
  it('shows swimming pace per 100m and keeps a 25m split exact', () => {
    expect(splitDistanceText(0.025)).toBe('25 m');
    expect(splitMetric({ duration_s: 15, distance_km: 0.025, avg_speed: 1.67 }, 'swimming'))
      .toMatchObject({ text: '1:00 /100m', source: 'elapsed_average' });
  });
  it.each(['rowing', 'kayaking'])('%s shows pace per 500m', sport => {
    expect(splitMetric({ duration_s: 120, distance_km: 0.5 }, sport).text).toBe('2:00 /500m');
  });
  it.each(['strength', 'yoga', 'boxing', 'climbing'])('%s does not invent speed from irrelevant distance', sport => {
    expect(splitMetric({ duration_s: 120, distance_km: 0.5, avg_speed: 3 }, sport))
      .toMatchObject({ text: '—', source: 'not_applicable' });
  });
  it('uses a valid device speed only when time or distance is unavailable', () => {
    expect(splitMetric({ avg_speed: 5 }, 'cycling')).toMatchObject({ text: '18.0 km/h', source: 'device_speed' });
    expect(splitMetric({ duration_s: 0, distance_km: 0 }, 'running').text).toBe('—');
    expect(splitMetric({ avg_speed: -4 }, 'running').text).toBe('—');
    expect(splitMetric({ avg_speed: 1000 }, 'running').text).toBe('—');
  });
  it('rounds seconds before computing minute remainder (never shows 4:60)', () => {
    expect(splitMetric({ duration_s: 299.8, distance_km: 1 }, 'running').text).toBe('5:00 /km');
    expect(splitDurationText(3661)).toBe('1:01:01');
    expect(splitDurationText(null)).toBe('—');
    expect(splitDistanceText(null)).toBe('—');
  });
});
