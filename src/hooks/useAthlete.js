import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

export function useAthlete() {
  const [athlete, setAthlete] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const user = await base44.auth.me();
        const profiles = await base44.entities.AthleteProfile.filter({ created_by_id: user.id });
        if (active) setAthlete(profiles.length > 0 ? profiles[0] : null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return { athlete, setAthlete, loading };
}