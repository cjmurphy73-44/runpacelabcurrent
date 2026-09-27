import { base44 } from "@/api/base44Client";

// All health-data RLS (WorkoutSession, DailyMetrics, LabResult, etc.) resolves
// the owning athlete via user.data.athlete_profile_id. Onboarding stamps it with
// base44.auth.updateMe right after creating the profile — but if that call ever
// failed (network blip, swallowed error), the user is locked out of their own
// data: the dashboard shows "create profile" even though one exists, and sync
// can't resolve the athlete. This self-heals the linkage on the next profile
// discovery so the user recovers without any manual action.
export async function ensureProfileLinked(user, profile) {
  if (!user || !profile) return;
  if (user.data?.athlete_profile_id === profile.id) return;
  try {
    await base44.auth.updateMe({ athlete_profile_id: profile.id });
  } catch (e) {
    console.warn("ensureProfileLinked: updateMe failed:", e);
  }
}