import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  Watch, Loader2, Link2, CheckCircle2, RefreshCw, Unlink, AlertTriangle,
} from "lucide-react";

// Plain-language Garmin connection state. Mirrors the COROS card: the athlete can
// tell at a glance whether data is flowing, what is being synced, when it last
// worked, and what to do about it, without reading an error code.
const SYNCED = "Workouts, sleep, HRV and resting heart rate";

function whenLabel(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export default function GarminConnectionCard({ athleteId }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("garminSync", { action: "status" });
      setStatus(res?.data || res || null);
    } catch (e) {
      // A failed check must not read as "not connected", that would send someone
      // through a reconnect they don't need. The state is explicitly unknown.
      setStatus({ unknown: true });
      setError(e?.response?.data?.error || "Couldn't check your Garmin connection just now.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const connect = async () => {
    setConnecting(true); setError(null); setInfo(null);
    try {
      const res = await base44.functions.invoke("garminSync", { action: "authorize" });
      const data = res?.data || res;
      const url = data?.authorize_url;
      if (!url) throw new Error(data?.error || "Garmin isn't accepting new connections right now.");
      if (window.self !== window.top) {
        // Inside the builder preview an iframe redirect would strand the consent
        // page, so open it as a real top-level window (same as COROS).
        const popup = window.open(url, "_blank");
        if (!popup) {
          setInfo(`Your browser blocked the window. Open Garmin manually: ${url}`);
          setConnecting(false);
          return;
        }
        window.addEventListener("focus", () => { loadStatus(); setConnecting(false); }, { once: true });
      } else {
        window.location.href = url;
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.data?.error || e?.message || "Could not start the Garmin connection.");
      setConnecting(false);
    }
  };

  const syncNow = async () => {
    setSyncing(true); setError(null); setInfo(null);
    try {
      const res = await base44.functions.invoke("garminSync", { action: "sync_historical" });
      const data = res?.data || res;
      if (data?.error) {
        setError(data.error);
      } else {
        const imported = Number(data?.imported || 0);
        const recovery = Number(data?.recovery_imported || 0);
        if (!imported && !recovery) {
          setInfo("Already up to date, no new workouts or recovery days since the last sync.");
        } else {
          const parts = [];
          if (imported) parts.push(`${imported} workout${imported === 1 ? "" : "s"}`);
          if (recovery) parts.push(`${recovery} recovery day${recovery === 1 ? "" : "s"}`);
          setInfo(`Imported ${parts.join(" and ")}.`);
        }
      }
      await loadStatus();
    } catch (e) {
      setError(e?.response?.data?.error || "Couldn't sync from Garmin. Your existing data is untouched.");
    }
    setSyncing(false);
  };

  const disconnect = async () => {
    if (!window.confirm("Disconnect Garmin? Automatic syncing stops until you reconnect. Your imported workouts stay.")) return;
    setDisconnecting(true); setError(null); setInfo(null);
    try {
      await base44.functions.invoke("garminSync", { action: "disconnect" });
      setStatus({ connected: false, needs_reconnect: false });
    } catch (e) {
      setError(e?.response?.data?.error || "Couldn't disconnect Garmin.");
    }
    setDisconnecting(false);
  };

  const connected = Boolean(status?.connected);
  const needsReconnect = Boolean(status?.needs_reconnect);
  const unknown = Boolean(status?.unknown);
  const lastSync = whenLabel(status?.last_sync_at);

  const stateLine = loading
    ? "Checking…"
    : unknown
      ? "Connection state unavailable right now."
      : connected
        ? lastSync ? `Last sync ${lastSync}` : "Connected, sync whenever you're ready"
        : needsReconnect
          ? "Authorization expired, reconnect to resume syncing"
          : "Not connected";

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 p-3 border border-border rounded-md">
        <div className="flex items-start gap-3 min-w-0">
          <div className="bg-muted p-2 rounded text-muted-foreground shrink-0">
            <Watch className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium flex items-center flex-wrap gap-2">
              Garmin Connect
              {connected && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                </span>
              )}
              {needsReconnect && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-warning">
                  <AlertTriangle className="w-3.5 h-3.5" /> Needs attention
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{stateLine}</p>
            <p className="text-xs text-muted-foreground mt-1">{SYNCED}.</p>
            {connected && status?.last_error && (
              <p className="text-xs text-destructive mt-1">{status.last_error}</p>
            )}
            {needsReconnect && (
              <p className="text-xs text-muted-foreground mt-1">Your imported workouts are safe, reconnecting resumes new data only.</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full sm:w-auto sm:items-end shrink-0">
          {connected ? (
            <>
              <Button variant="outline" size="sm" onClick={syncNow} disabled={syncing} className="w-full justify-center min-h-[44px]">
                {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Sync now
              </Button>
              <Button variant="ghost" size="sm" onClick={disconnect} disabled={disconnecting} className="w-full justify-center min-h-[44px]">
                {disconnecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Unlink className="w-4 h-4 mr-2" />}
                Disconnect
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={connect} disabled={connecting || loading} className="w-full justify-center min-h-[44px]">
              {connecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : needsReconnect ? <Link2 className="w-4 h-4 mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
              {needsReconnect ? "Reconnect Garmin" : "Connect Garmin"}
            </Button>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {info && <p className="text-sm text-primary break-words">{info}</p>}
      <p className="text-xs text-muted-foreground">
        Prefer not to connect an account? Export a <span className="font-medium">.fit</span> or{" "}
        <span className="font-medium">.csv</span> from Garmin Connect and upload it under Import workout files, it
        carries the same measured data.
      </p>
    </div>
  );
}