import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Link2, CheckCircle2, RefreshCw, Unlink } from "lucide-react";

// Metadata for each free OAuth wearable. icon: a lucide icon name string rendered below.
const PROVIDERS = [
  { key: "oura", label: "Oura Ring", blurb: "Readiness, HRV, sleep, RHR — the richest recovery ring." },
  { key: "whoop", label: "Whoop", blurb: "Recovery score, HRV, RHR, sleep — recovery-first strap." },
  { key: "withings", label: "Withings", blurb: "Sleep, HRV, RHR, body comp — health-first wearables." },
  { key: "polar", label: "Polar", blurb: "Nightly Recharge recovery, sleep, HRV via AccessLink." },
  { key: "fitbit", label: "Fitbit", blurb: "Sleep score, HRV, resting HR via Fitbit Web API." },
  { key: "suunto", label: "Suunto", blurb: "Sleep + activity summary (recovery is thin)." },
];

function ProviderCard({ provider, athleteId }) {
  const { key, label, blurb } = provider;
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("wearableOAuthSync", { action: "status", provider: key });
      setStatus(res.data || res);
    } catch (e) {
      setError(e?.response?.data?.error || `Could not check ${label} connection.`);
    }
    setLoading(false);
  }, [key, label]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const connect = async () => {
    setConnecting(true); setError(null);
    try {
      const res = await base44.functions.invoke("wearableOAuthSync", { action: "authorize", provider: key });
      const url = res.data?.authorize_url || res.authorize_url;
      if (!url) throw new Error("No authorize URL returned");
      if (window.self !== window.top) {
        window.open(url, "_blank");
        window.addEventListener("focus", () => { loadStatus(); setConnecting(false); }, { once: true });
      } else {
        window.location.href = url;
      }
    } catch (e) {
      setError(e?.response?.data?.error || `Could not start ${label} connection.`);
      setConnecting(false);
    }
  };

  const sync = async () => {
    setSyncing(true); setError(null); setInfo(null);
    try {
      const res = await base44.functions.invoke("wearableOAuthSync", { action: "sync", provider: key });
      const data = res.data || res;
      if (data.success !== false) {
        setInfo(`Ingested ${data.imported ?? 0} recovery day(s)${data.errors ? `, ${data.errors} skipped` : ""}${data.fetchError ? ` (fetch note: ${data.fetchError})` : ""}.`);
      } else {
        setError(data.error || `${label} sync failed.`);
      }
      loadStatus();
    } catch (e) {
      setError(e?.response?.data?.error || `${label} sync failed.`);
    }
    setSyncing(false);
  };

  const disconnect = async () => {
    if (!window.confirm(`Disconnect your ${label} account? Recovery sync from ${label} will stop until you reconnect.`)) return;
    setDisconnecting(true); setError(null);
    try {
      await base44.functions.invoke("wearableOAuthSync", { action: "disconnect", provider: key });
      setStatus(null);
    } catch (e) {
      setError(e?.response?.data?.error || `Could not disconnect.`);
    }
    setDisconnecting(false);
  };

  const connected = status?.connected;

  return (
    <div className="flex flex-col gap-1 p-3 border border-border rounded-md">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-muted p-2 rounded text-muted-foreground shrink-0">
            <Link2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium flex items-center gap-2">
              {label}
              {connected && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {loading ? "Checking…" : connected ? (status?.last_sync_at ? `Last sync ${new Date(status.last_sync_at).toLocaleString()}` : "Connected — use Sync to pull recovery") : blurb}
            </p>
            {connected && status?.last_error && (
              <p className="text-xs text-destructive mt-0.5 truncate">{status.last_error}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {connected ? (
            <>
              <Button variant="outline" size="sm" onClick={sync} disabled={syncing}>
                {syncing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                <span className="hidden sm:inline">Sync</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={disconnect} disabled={disconnecting}>
                {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={connect} disabled={connecting}>
              {connecting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Link2 className="w-4 h-4 mr-1" />}
              Connect
            </Button>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {info && <p className="text-xs text-primary">{info}</p>}
    </div>
  );
}

export default function WearableIntegrations({ athleteId }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Free OAuth wearables. Each needs its own developer app + client credentials (set as app secrets) before Connect works —
        see the notes below the cards.
      </p>
      {PROVIDERS.map((p) => (
        <ProviderCard key={p.key} provider={p} athleteId={athleteId} />
      ))}
      <p className="text-xs text-muted-foreground pt-1">
        To enable a provider: register an app at its developer portal, set the redirect URI to
        <span className="font-mono"> https://trainpacelab.base44.app/functions/wearableOAuthSync</span>,
        then add the issued client id/secret as <span className="font-mono">{'<BRAND>_CLIENT_ID'}</span> /
        <span className="font-mono"> {'<BRAND>_CLIENT_SECRET'}</span> app secrets.
      </p>
    </div>
  );
}