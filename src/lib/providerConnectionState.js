/** Interpret provider status without mistaking missing signals for healthy sync. */
export function classifyProviderConnection(status) {
  if (!status || typeof status !== "object") return "unknown";
  if (status.needs_reconnect === true || status.status === "expired" || status.status === "error") return "expired";
  if (status.connected === false && (status.status === "disconnected" || status.needs_reconnect === false)) return "disconnected";
  if (status.connected === true && status.needs_reconnect === false) return "ok";
  return "unknown";
}
