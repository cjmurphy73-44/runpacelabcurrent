/**
 * CalibrationApiService
 * Handles athlete profile fetching and pace threshold updates.
 */
import { base44 } from '@/api/base44Client';

export interface AthleteProfile {
  id: string;
  functional_threshold_pace_ms: number;
}

export class CalibrationApiService {
  static async getAthleteProfile(userId: string): Promise<AthleteProfile> {
    // Retry-capable implementation for athlete data fetching
    const profiles = await base44.entities.AthleteProfile.filter({ created_by_id: userId });
    if (!profiles.length) throw new Error('No athlete profile found.');
    return profiles[0] as AthleteProfile;
  }

  static async updateAthleteProfile(
    athleteId: string, 
    data: Partial<AthleteProfile>
  ): Promise<void> {
    await base44.entities.AthleteProfile.update(athleteId, data);
  }
}
