import { useEffect, useState } from "react";
import { useServices } from "@/services/providers/ServiceContext";
import { useAuth } from "@/lib/AuthContext";

export function useAthlete() {
  const { athleteProfileRepo } = useServices();
  const { user } = useAuth();
  const [athlete, setAthlete] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user?.id) {
        if (active) setLoading(false);
        return;
      }
      try {
        const profiles = await athleteProfileRepo.filter({ created_by_id: user.id });
        if (active) setAthlete(profiles.length > 0 ? profiles[0] : null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [athleteProfileRepo, user?.id]);

  return { athlete, setAthlete, loading };
}