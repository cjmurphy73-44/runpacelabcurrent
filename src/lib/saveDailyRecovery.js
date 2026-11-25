import { base44 } from "@/api/base44Client";

export async function saveDailyRecovery(athleteId, records) {
  let created = 0;
  let updated = 0;
  for (let offset = 0; offset < records.length; offset += 100) {
    const { data } = await base44.functions.invoke("saveDailyRecovery", {
      athlete_id: athleteId,
      records: records.slice(offset, offset + 100),
    });
    if (!Number.isInteger(data?.created) || !Number.isInteger(data?.updated)) throw new Error("Could not confirm the recovery save.");
    created += data.created;
    updated += data.updated;
  }
  return { created, updated };
}
