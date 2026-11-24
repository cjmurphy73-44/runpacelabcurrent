import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useServices } from "@/services/providers/ServiceContext";
import { useAuth } from "@/lib/AuthContext";
import { ensureProfileLinked } from "@/lib/profileLinkage";

// Resolve the verified profile, with a fallback to profiles owned by this user.
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
        const linkedId = user.data?.verified_athlete_profile_id ?? user.verified_athlete_profile_id;
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
        if (profile) await ensureProfileLinked(user, profile);
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