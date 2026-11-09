import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useProviderConnectionStatus } from "@/hooks/useProviderConnectionStatus";
import { providerSyncFeedback } from "@/lib/providerSyncFeedback";
import { Button } from "@/components/ui/button";
import { Loader2, Link2, CheckCircle2, RefreshCw, Unlink } from "lucide-react";

export default function CorosIntegration(props) {
  const { user } = useAuth();
  return <ConnectionCard key={`${user?.id}:${props.athleteId}`} {...props} />;
}

function ConnectionCard({ athleteId }) {
  const { status, loading, statusError, loadStatus } = useProviderConnectionStatus("corosSync", athleteId);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncingRecovery, setSyncingRecovery] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const connect = async () => {
    if (!window.confirm("Before we open COROS: make sure you're already logged into coros.com in this browser and ready to approve quickly, COROS's authorization window is only about a minute. Continue?")) return;
    setConnecting(true); setError(null); setInfo(null);
    try {
      const res = await base44.functions.invoke("corosSync", { action: "authorize" });
      const url = res?.data?.authorize_url || res?.authorize_url;
      if (!url) throw new Error(res?.data?.error || res?.error || "No authorize URL returned");
      // OAuth cross-site redirects must run in a top-level window so the provider's
      // SameSite=Lax state cookie survives the redirect back into its callback.
      // Inside an iframe (builder preview) that cookie is dropped → "Invalid state".
      if (window.self !== window.top) {
        const popup = window.open(url, "_blank");
        if (!popup) {
          // Pop-up was blocked (common after an async await in an iframe). Surface the
          // URL so the athlete can open it manually instead of the button doing nothing.
          setInfo(`Pop-up was blocked. Open COROS manually: ${url}`);
          setConnecting(false);
          return;
        }
        const onFocus = () => { loadStatus(); setConnecting(false); };
        window.addEventListener("focus", onFocus, { once: true });
      } else {
        window.location.href = url;
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.data?.error || e?.message || "Could not start COROS connection.");
      setConnecting(false);
    }
  };

  const syncHistorical = async () => {
    setSyncing(true); setError(null); setInfo(null);
    try {
      const res = await base44.functions.invoke("corosSync", { action: "sync_historical" });
      const data = res.data || res;
      const feedback = providerSyncFeedback(data);
      if (data.errors > 0 || data.toolErrors?.length) setError(feedback);
      else setInfo(feedback);
      await loadStatus();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Historical sync could not be confirmed. Check status before retrying.");
    }
    setSyncing(false);
  };

  const syncRecovery = async () => {
    setSyncingRecovery(true); setError(null); setInfo(null);
    try {
      const res = await base44.functions.invoke("corosSync", { action: "sync_recovery" });
      const data = res.data || res;
      const feedback = providerSyncFeedback(data, { recoveryOnly: true });
      if (data.errors > 0 || data.toolErrors?.length) setError(feedback);
      else setInfo(feedback);
      await loadStatus();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Recovery sync could not be confirmed.");
    }
    setSyncingRecovery(false);
  };

  const disconnect = async () => {
    if (!window.confirm("Disconnect your COROS account? Auto-sync from COROS will stop until you reconnect.")) return;
    setDisconnecting(true); setError(null);
    try {
      const { data } = await base44.functions.invoke("corosSync", { action: "disconnect" });
      if (data?.success !== true || data.error) throw new Error(data?.error || "Disconnect could not be confirmed. Retry the status check.");
      await loadStatus();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Could not disconnect.");
    }
    setDisconnecting(false);
  };

  const needsReconnect = Boolean(status?.needs_reconnect);
  const unknown = Boolean(status?.unknown);
  const connected = Boolean(status?.connected) && !needsReconnect && !unknown;
  const lastSync = status?.last_sync_at && !Number.isNaN(new Date(status.last_sync_at).getTime()) ? new Date(status.last_sync_at).toLocaleString() : null;
  const busy = loading || connecting || syncing || syncingRecovery || disconnecting;

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border border-border rounded-md">
        <div className="flex items-center gap-3">
          <div className="bg-muted p-2 rounded text-muted-foreground">
            <Link2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium flex items-center gap-2">
              COROS
              {connected && !loading && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {loading
                ? "Checking…"
                : unknown ? "Connection status unavailable" : needsReconnect ? "Authorization expired, reconnect to resume syncing" : connected
                  ? lastSync
                    ? `Last sync ${lastSync}`
                    : "Connected, use Sync workouts to pull activities"
                  : "Not connected"}
            </p>
            {needsReconnect && (
              <p className="text-xs text-destructive mt-0.5">Your COROS login expired. Your imported workouts are safe.</p>
            )}
            {connected && status?.last_error && (
              <p className="text-xs text-destructive mt-0.5">
                {String(status.last_error).split(";").map((s) => s.trim()).filter(Boolean).filter((s, i, arr) => arr.indexOf(s) === i).join("; ")}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 w-full sm:w-auto sm:items-end">
          {unknown ? <Button variant="outline" size="sm" onClick={() => loadStatus()} disabled={loading}>Retry COROS status</Button> : connected ? (
            <>
              <div className="flex flex-col gap-2 w-full">
                <Button variant="outline" size="sm" onClick={syncHistorical} disabled={busy} className="w-full justify-center min-h-[44px]">
                  {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  {syncing ? "Syncing workouts..." : "Sync workouts"}
                </Button>
                <Button variant="outline" size="sm" onClick={syncRecovery} disabled={busy} className="w-full justify-center min-h-[44px]">
                  {syncingRecovery ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  {syncingRecovery ? "Syncing recovery..." : "Sync recovery"}
                </Button>
              </div>
              <Button variant="ghost" size="sm" onClick={disconnect} disabled={busy} className="w-full sm:w-auto justify-center min-h-[44px]">
                {disconnecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Unlink className="w-4 h-4 mr-2" />}
                Disconnect
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={connect} disabled={busy} className="w-full sm:w-auto justify-center min-h-[44px]">
              {connecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
              {needsReconnect ? "Reconnect COROS" : "Connect COROS Account"}
            </Button>
          )}
        </div>
      </div>
      {statusError && <p role="alert" className="text-sm text-destructive">{statusError}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {info && <p role="status" className="text-sm text-primary">{info}</p>}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Heads up:</span> COROS's authorization window is short
          (about a minute). For a reliable connection, <span className="font-medium">log into coros.com in this
          browser first</span>, then click Connect and approve quickly. If it still fails, you can try a manual file upload below. Availability depends on the recording.
        </p>
        <p className="text-xs text-muted-foreground">
          Prefer a manual export? Drag exported <span className="font-medium">.fit</span> files from the COROS app
          (Profile → Workout → Export Data) into the bulk importer on the dashboard.
        </p>
      </div>
    </div>
  );
}