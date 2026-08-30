import { useAuth } from "@/lib/AuthContext";
import { useAthlete } from "@/hooks/useAthlete";
import { useSubscription } from "@/hooks/useSubscription";

export interface CoachAccess {
  loading: boolean;
  coachMode: boolean; // user has selected the coach profile (or is a platform coach/admin)
  plan: string;
  isPro: boolean;
  teamActive: boolean;
  canUseCoachWorkspace: boolean; // coachMode + Team plan (admins bypass the paywall)
}

// Hybrid coach-access model:
//  - coachMode (nav visibility) = self-selected Coach profile (AthleteProfile.profile_role)
//    OR platform role 'coach'/'admin'.
//  - canUseCoachWorkspace (actual roster access) = Team plan active, OR platform admin.
// Athletes (default) never see coaching navigation; coaches keep full athlete features.
export function useCoachAccess(): CoachAccess {
  const { user } = useAuth();
  const { athlete, loading: athleteLoading } = useAthlete();
  const { plan, loading: subLoading, isPro } = useSubscription();

  const isAdmin = user?.role === "admin";
  const coachMode = isAdmin || user?.role === "coach" || athlete?.profile_role === "coach";
  const teamActive = plan === "team";

  return {
    loading: athleteLoading || subLoading,
    coachMode,
    plan,
    isPro,
    teamActive,
    canUseCoachWorkspace: isAdmin || (coachMode && teamActive),
  };
}