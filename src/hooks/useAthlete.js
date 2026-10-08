import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useServices } from "@/services/providers/ServiceContext";
import { useAuth } from "@/lib/AuthContext";

// Resolves the signed-in user's athlete profile using the same precedence as
// the dashboard: the profile explicitly linked on the user record
// (user.data.athlete_profile_id) first — RLS allows that read even when
// created_by_id doesn't match — then a fallback to the most recently updated
// profile owned by this user. Exposes `error` so callers can distinguish a
// confirmed-missing profile (onboarding needed) from a transient lookup
// failure (retry / link to settings).
export function useAthlete() {
  const { athleteProfileRepo } = useServices();
  const { user } = useAuth();
  const [athlete, setAthlete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user?.id) {
        if (active) setLoading(false);
        return;
      }
      try {
        let profile = null;
        const linkedId = user.data?.athlete_profile_id;
        if (linkedId) {
          try {
            profile = await base44.entities.AthleteProfile.get(linkedId);
          } catch (err) {
            console.warn("Linked athlete_profile_id not resolvable:", err);
            profile = null;
          }
        }
        if (!profile) {
          const profiles = await athleteProfileRepo.filter(
            { created_by_id: user.id },
            "-updated_date",
            50
          );
          profile = profiles?.length > 0 ? profiles[0] : null;
        }
        if (active) setAthlete(profile);
      } catch (err) {
        console.error("useAthlete profile lookup failed:", err);
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [athleteProfileRepo, user?.id]);

  return { athlete, setAthlete, loading, error };
}