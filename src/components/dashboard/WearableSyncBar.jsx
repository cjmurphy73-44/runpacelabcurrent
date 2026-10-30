import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { RefreshCw, Watch, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";

// One-click wearable refresh. Reads each provider's real connection status first, so
// the button only syncs what is actually connected and an expired grant is shown as
// "reconnect" instead of failing silently.
export default function WearableSyncBar({ onSynced }) {
  const { toast } = useToast();
  const [status, setStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const loadStatus = useCallback(async () => {
    const read = async (fn) => {
      try {
        const res = await base44.functions.invoke(fn, { action: "status" });
        return res?.data || res || null;
      } catch {
        return null;
      }
    };
    const [coros, garmin] = await Promise.all([read("corosSync"), read("garminSync")]);
    setStatus({ coros, garmin });
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const connected = [];
  if (status?.coros?.connected) connected.push("COROS");
  if (status?.garmin?.connected) connected.push("Garmin");
  const needsReconnect = status?.coros?.needs_reconnect || status?.garmin?.needs_reconnect;
  const lastSync = [status?.coros?.last_sync_at, status?.garmin?.last_sync_at].filter(Boolean).sort().pop();

  const handleSync = async () => {
    setSyncing(true);
    let imported = 0;
    const problems = [];
    try {
      if (status?.coros?.connected) {
        for (const action of ["sync_historical", "sync_recovery"]) {
          try {
            const res = await base44.functions.invoke("corosSync", { action });
            const data = res?.data || res;
            imported += Number(data?.imported || 0);
            if (data?.error) problems.push(`COROS: ${data.error}`);
          } catch (err) {
            problems.push(`COROS: ${err?.response?.data?.error || err?.message}`);
          }
        }
      }
      if (status?.garmin?.connected) {
        try {
          const res = await base44.functions.invoke("garminSync", { action: "sync_historical" });
          const data = res?.data || res;
          imported += Number(data?.imported || 0) + Number(data?.recovery_imported || 0);
          if (data?.error) problems.push(`Garmin: ${data.error}`);
        } catch (err) {
          problems.push(`Garmin: ${err?.response?.data?.error || err?.message}`);
        }
      }
      await loadStatus();
      if (problems.length) {
        toast({ title: "Sync finished with issues", description: problems.join(" · "), variant: "destructive" });
      } else {
        toast({
          title: imported ? `Synced ${imported} new item${imported === 1 ? "" : "s"}` : "Already up to date",
          description: imported ? "Your dashboard has been refreshed." : "No new workouts or recovery data since the last sync.",
        });
      }
      if (imported) onSynced?.();
    } finally {
      setSyncing(false);
    }
  };

  if (!status) return null;

  if (connected.length === 0 && !needsReconnect) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-2"><Watch className="w-3.5 h-3.5" /> No wearable connected yet.</span>
        <Link to="/settings" className="text-primary font-medium hover:underline whitespace-nowrap">Connect one</Link>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/60 px-3 py-2">
      <div className="min-w-0 text-xs">
        <p className="flex items-center gap-1.5 font-medium truncate">
          {needsReconnect ? <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" /> : <Watch className="w-3.5 h-3.5 text-primary shrink-0" />}
          {needsReconnect ? "Connection expired" : connected.join(" · ")}
        </p>
        <p className="text-muted-foreground truncate">
          {needsReconnect
            ? "Reconnect to resume sync."
            : lastSync ? `Last sync ${moment(lastSync).fromNow()}` : "Not synced yet"}
        </p>
      </div>
      {needsReconnect ? (
        <Button asChild size="sm" variant="outline">
          <Link to="/settings">Reconnect</Link>
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing} className="whitespace-nowrap">
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing…" : "Refresh"}
        </Button>
      )}
    </div>
  );
}