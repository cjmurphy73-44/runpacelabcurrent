import { base44 } from "@/api/base44Client";

export async function linkAthleteProfile(profileId) {
  const { data } = await base44.functions.invoke("linkAthleteProfile", { athlete_id: profileId });
  if (!data?.success) throw new Error("Could not confirm athlete profile link");
}

export async function ensureProfileLinked(user, profile) {
  if (profile?.created_by_id !== user?.id) return;
  const linked = user?.data?.verified_athlete_profile_id ?? user?.verified_athlete_profile_id;
  if (linked !== profile.id) await linkAthleteProfile(profile.id);
}
