// Tiny in-app bus for coach hold clearance.
// Several surfaces derive the hold independently (Today's Session, Training Calendar, Plan).
// When one of them persists a clearance, the others must drop the hold immediately rather
// than wait for a remount, so the clearance is published once and every mounted hook adopts it.
const listeners = new Set();

export function publishHoldCleared(athleteId, clearedAt) {
  for (const listener of listeners) {
    try {
      listener({ athleteId, clearedAt });
    } catch {
      // A failing subscriber must never break the surface that performed the save.
    }
  }
}

export function subscribeHoldCleared(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}