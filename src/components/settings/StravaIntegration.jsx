import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, RefreshCw, Unlink, Activity } from "lucide-react";

export default function StravaIntegration({ athleteId }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("stravaSync", { action: "status" });
      setStatus(res.data || res);
    } catch (e) { setError(e?.response?.data?.error || "Could not check Strava connection."); }
    setLoading(false);
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const connect = async () => {
    setConnecting(true); setError(null);
    try {
      const res = await base44.functions.invoke("stravaSync", { action: "authorize" });
      const url = res.data?.authorize_url || res.authorize_url;
      if (!url) throw new Error("No authorize URL returned");
      window.location.href = url;
    } catch (e) { setError(e?.response?.data?.error || "Could not start Strava connection."); setConnecting(false); }
  };
  const syncHistorical = async () => {
    setSyncing(true); setError(null); setInfo(null);
    try {
      const res = await base44.functions.invoke("stravaSync", { action: "sync_historical" });
      const data = res.data || res;
      setInfo(`Imported ${data.imported ?? 0} workout(s)${data.errors ? `, ${data.errors} skipped` : ""}.`);
      loadStatus();
    } catch (e) { setError(e?.response?.data?.error || "Historical sync failed."); }
    setSyncing(false);
  };
  const disconnect = async () => {
    if (!window.confirm("Disconnect your Strava account? Future Strava webhook events will stop syncing until you reconnect.")) return;
    setDisconnecting(true); setError(null);
    try { await base44.functions.invoke("stravaSync", { action: "disconnect" }); setStatus(null); } catch (e) { setError(e?.response?.data?.error || "Could not disconnect."); }
    setDisconnecting(false);
  };

  const connected = status?.connected;

  return (
    <div className="flex items-center justify-between p-3 border border-border rounded-md">
      <div className="flex items-center gap-3">
        <div className="bg-muted p-2 rounded text-muted-foreground"><Activity className="w-5 h-5" /></div>
        <div>
          <p className="text-sm font-medium flex items-center gap-2">Strava{connected && <span className="inline-flex items-center gap-1 text-xs font-medium text-primary"><CheckCircle2 className="w-3.5 h-3.5" /> Connected</span>}</p>
          <p className="text-xs text-muted-foreground">
            {loading ? "Checking…" : connected ? (status?.last_sync_at ? `Last sync ${new Date(status.last_sync_at).toLocaleString()}` : "Connected — new activities auto-sync via webhook") : "Not connected"}
          </p>
          {connected && status?.last_error && <p className="text-xs text-destructive mt-0.5">{status.last_error}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {connected ? (
          <>
            <Button variant="outline" size="sm" onClick={syncHistorical} disabled={syncing}>{syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}Sync historical</Button>
            <Button variant="ghost" size="sm" onClick={disconnect} disabled={disconnecting}>{disconnecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Unlink className="w-4 h-4 mr-2" />}Disconnect</Button>
          </>
        ) : (
          <Button size="sm" onClick={connect} disabled={connecting}>{connecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}Connect Strava</Button>
        )}
      </div>
    </div>
  );
}