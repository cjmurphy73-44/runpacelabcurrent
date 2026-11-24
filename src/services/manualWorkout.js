import { base44 } from "@/api/base44Client";

export async function saveManualWorkout(input) {
  const { data } = await base44.functions.invoke("logManualWorkout", input);
  if (!data?.success || !data.workout_session?.id) {
    throw new Error(data?.error || "The workout save could not be confirmed. Check history before retrying.");
  }
  return data;
}
