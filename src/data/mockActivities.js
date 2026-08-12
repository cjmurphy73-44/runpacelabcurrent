export const mockActivities = [
  {
    id: 'activity-001',
    title: 'Morning Interval Run',
    date: '2026-08-12',
    type: 'Run',
    source: 'Garmin',
    distance: 6.0,
    duration: '00:25:00',
    avgPace: '4:10',
    tss: 85,
    telemetryStream: Array.from({ length: 6000 }, (_, i) => ({
      distanceMeters: i + 1,
      durationSeconds: i / 4, // Roughly 4m/s = 4:10/km
      heartRate: 150 + Math.sin(i / 100) * 10,
      power: 250 + Math.random() * 20,
    })).map((point, i) => {
      // Inject 1k surge: 1500m to 2500m at 3:20/km
      if (i >= 1500 && i < 2500) {
        return {
          ...point,
          durationSeconds: point.distanceMeters * 0.2 // 3:20/km = 5m/s = 0.2s/m
        };
      }
      return point;
    })
  }
];
