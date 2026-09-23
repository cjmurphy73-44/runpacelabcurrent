import { useState, useEffect, useCallback } from 'react';
import { useServices } from '@/services/providers/ServiceContext';

type Calibration = {
  status: 'needs_adjustment' | 'ok';
  suggestedPaceAdjustment: number;
};

/**
 * Placeholder pace-calibration hook. Surfaces a suggested pace-zone
 * adjustment and exposes `acceptAdjustment`, which applies the drift
 * to the athlete's `functional_threshold_pace_ms` so pace targets across
 * the app re-anchor from the new threshold.
 */
export function usePaceCalibration() {
  const { authService, athleteProfileRepo } = useServices();
  const [calibration, setCalibration] = useState<Calibration | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    // Placeholder drift detection — a real engine would compare recent
    // threshold efforts against the stored FTP. For now we surface a
    // suggested 5% adjustment so the accept flow is exercisable.
    const timer = setTimeout(() => {
      setCalibration({ status: 'needs_adjustment', suggestedPaceAdjustment: 0.05 });
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const acceptAdjustment = useCallback(async () => {
    const adj = calibration?.suggestedPaceAdjustment;
    if (!adj || accepting || accepted) return;
    setAccepting(true);
    try {
      const user = await authService.me();
      const profiles = await athleteProfileRepo.filter({ created_by_id: user.id });
      if (!profiles.length) throw new Error('No athlete profile found.');
      const athlete = profiles[0];
      const current = athlete.functional_threshold_pace_ms || 0;
      if (current > 0) {
        // Fitness gained -> threshold pace (m/s) increases by the suggested fraction.
        const next = Math.round(current * (1 + adj) * 1000) / 1000;
        await athleteProfileRepo.update(athlete.id, {
          functional_threshold_pace_ms: next,
        });
      }
      setAccepted(true);
      setCalibration((c) => (c ? { ...c, status: 'ok' } : c));
    } finally {
      setAccepting(false);
    }
  }, [calibration, accepting, accepted, authService, athleteProfileRepo]);

  return { calibration, loading, acceptAdjustment, accepting, accepted };
}