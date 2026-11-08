import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, RefreshCw, WifiOff } from "lucide-react";

<<<<<<< Updated upstream
// One dashboard banner for every connection that has stopped delivering data.
// Covers Garmin as well as COROS, says what stopped and what is safe, and starts
// re-authorization right here, no detour into settings just to find a button.
const PROVIDERS = [
  { fn: "corosSync", label: "COROS" },
  { fn: "garminSync", label: "Garmin" },
];

export default function ConnectionHealthBanner() {
  const [broken, setBroken] = useState([]);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    const read = async ({ fn, label }) => {
      try {
        const res = await base44.functions.invoke(fn, { action: "status" });
        const s = res?.data || res || {};
        return s?.needs_reconnect ? { fn, label, reason: s.last_error || null } : null;
      } catch {
        // A failed check is unknown, not "expired", never nag about a connection
        // we couldn't read.
        return null;
      }
    };
    Promise.all(PROVIDERS.map(read))
      .then((rows) => { if (active) setBroken(rows.filter(Boolean)); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const reconnect = async ({ fn, label }) => {
    setBusy(fn); setError(null);
=======
export default function ConnectionHealthBanner({ 
  provider = "Garmin", 
  status = "active", // 'active' | 'expired' | 'error' | 'disconnected'
  lastSyncedAt = null,
  onReconnect,
  onSyncNow 
}) {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    if (!onSyncNow) return;
    setSyncing(true);
>>>>>>> Stashed changes
    try {
      await onSyncNow();
    } finally {
      setSyncing(false);
    }
  };

  const getStatusConfig = () => {
    switch (status) {
      case "active":
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />,
          bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400",
          label: "Connected & Healthy",
        };
      case "expired":
        return {
          icon: <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />,
          bg: "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400",
          label: "Token Expired — Reconnect Required",
        };
      case "error":
        return {
          icon: <WifiOff className="w-4 h-4 text-destructive shrink-0" />,
          bg: "bg-destructive/10 border-destructive/20 text-destructive",
          label: "Sync Error Detected",
        };
      default:
        return {
          icon: <WifiOff className="w-4 h-4 text-muted-foreground shrink-0" />,
          bg: "bg-muted/50 border-border text-muted-foreground",
          label: "Not Connected",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border text-sm ${config.bg}`}>
      <div className="flex items-center gap-2.5">
        {config.icon}
        <div>
          <span className="font-medium">{provider}:</span> {config.label}
          {lastSyncedAt && status === "active" && (
            <span className="ml-2 text-xs opacity-75">
              (Last synced {lastSyncedAt})
            </span>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {status === "active" ? (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSync} 
            disabled={syncing}
            className="h-8 text-xs bg-background/50 hover:bg-background"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Now"}
          </Button>
        ) : (
          <Button 
            variant="default" 
            size="sm" 
            onClick={onReconnect}
            className="h-8 text-xs"
          >
            Reconnect {provider}
          </Button>
        )}
      </div>
    </div>
  );
}
