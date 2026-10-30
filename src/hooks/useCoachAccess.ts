import { useAuth } from "@/lib/AuthContext";
import { useAthlete } from "@/hooks/useAthlete";
import { useSubscription } from "@/hooks/useSubscription";
import { hasFeature } from "@/lib/subscriptionFeatures";

export interface CoachAccess {
  loading: boolean;
  coachMode: boolean; // user has selected the coach profile (or is a platform coach/admin)
  plan: string;
  isPro: boolean;
  teamActive: boolean;
  canUseCoachWorkspace: boolean; // Coach Pro plan (admins bypass the paywall)
}

// Coach-access model:
//  - coachMode = self-selected Coach profile (AthleteProfile.profile_role)
//    OR platform role 'coach'/'admin'. Descriptive only.
//  - canUseCoachWorkspace (roster visibility + access) = Coach Pro plan active, OR platform
//    admin. The Roster is a paid Coach Pro surface, so an individual athlete on any
//    non-coach plan never sees or reaches it.
export function useCoachAccess(): CoachAccess {
  const { user } = useAuth();
  const { athlete, loading: athleteLoading } = useAthlete();
  const { plan, loading: subLoading, isPro } = useSubscription();

  const isAdmin = user?.role === "admin";
  const coachMode = isAdmin || user?.role === "coach" || athlete?.profile_role === "coach";
  // Roster access requires a Coach Pro plan (or the legacy "team" tier).
  const teamActive = plan === "coach_pro" || plan === "team";

  return {
    loading: athleteLoading || subLoading,
    coachMode,
    plan,
    isPro,
    teamActive,
    canUseCoachWorkspace: isAdmin || teamActive,
  };
}