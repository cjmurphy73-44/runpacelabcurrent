// Pure preparation: never mutate existing plans until the replacement draft
// has passed structural validation and its calendar sessions are constructed.
import { validatePlanStructure } from './planValidation.ts';

export function prepareDraftPlanCommit(plan: any): {
  valid: boolean;
  errors: string[];
  sessions: any[];
} {
  const validation = validatePlanStructure(plan, null);
  if (!validation.valid || !validation.sanitized) {
    return { valid: false, errors: validation.errors, sessions: [] };
  }

  const sessions: any[] = [];
  for (const week of validation.sanitized.weekly_plans || []) {
    for (const day of week.days || []) {
      if (!day.date || day.session_type === 'rest') continue;
      sessions.push({
        training_plan_id: plan.id,
        athlete_id: plan.athlete_id,
        date: day.date,
        sport: day.sport || 'running',
        prescribed_duration_minutes: day.prescribed_duration_minutes || 0,
        prescribed_intensity_zone: day.prescribed_intensity_zone || '',
        rationale_text: `${day.title || ''}${day.description ? ' — ' + day.description : ''}`,
        status: 'pending',
      });
    }
  }
  return { valid: true, errors: [], sessions };
}
