import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { RefreshCw, Watch } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ConnectionHealthBanner from "@/components/dashboard/ConnectionHealthBanner";
import moment from "moment";

const PROVIDERS = [
  { fn: "corosSync", label: "COROS", syncActions: ["sync_historical", "sync_recovery"] },
  { fn: "garminSync", label: "Garmin", syncActions: ["sync_historical"] },
];

export default function WearableSyncBar({ onSynced, showConnect = true }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const { data: connections, isFetching, refetch } = useQuery({
    queryKey: ["wearable-status", user?.id],
    enabled: Boolean(user?.id),
    staleTime: 60_000,
    retry: false,
    queryFn: () => Promise.all(PROVIDERS.map(async (provider) => {
      try {
        const { data } = await base44.functions.invoke(provider.fn, { action: "status" });
        return { ...provider, status: data };
      } catch {
        return { ...provider, status: null };
      }
    })),
  });

  if (!connections) return null;

  const connected = connections.filter(({ status }) => status?.connected && !status?.needs_reconnect);
  const broken = connections.filter(({ status }) => status?.needs_reconnect === true);
  const unknown = connections.filter(({ status }) =>
    typeof status?.connected !== "boolean" && typeof status?.needs_reconnect !== "boolean");
  const lastSync = connected.map(({ status }) => status.last_sync_at).filter(Boolean).sort().pop();

  const handleSync = async () => {
    setSyncing(true);
    let imported = 0;
    const problems = [];
    try {
      for (const { fn, label, syncActions } of connected) {
        for (const action of syncActions) {
          try {
            const { data } = await base44.functions.invoke(fn, { action });
            imported += Number(data?.imported || 0);
            if (fn === "garminSync") imported += Number(data?.recovery_imported || 0);
            if (data?.error) problems.push(`${label}: ${data.error}`);
          } catch (error) {
            problems.push(`${label}: ${error?.response?.data?.error || error?.message}`);
          }
        }
      }
      await refetch();
      if (problems.length) {
        toast({ title: "Sync finished with issues", description: problems.join(" · "), variant: "destructive" });
      } else {
        toast({
          title: imported ? `Synced ${imported} new item${imported === 1 ? "" : "s"}` : "Already up to date",
          description: imported ? "Your dashboard has been refreshed." : "No new workouts or recovery data found.",
        });
      }
      if (imported) onSynced?.();
    } finally {
      setSyncing(false);
    }
  };

  const hasStatusIssue = broken.length > 0 || unknown.length > 0;
  if (connected.length === 0 && !hasStatusIssue && !showConnect) return null;

  return (
    <div className="space-y-2">
      <ConnectionHealthBanner broken={broken} unknown={unknown} checking={isFetching} onRefresh={refetch} />
      {connected.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/60 px-3 py-2">
          <div className="min-w-0 text-xs">
            <p className="flex items-center gap-1.5 font-medium">
              <Watch className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
              {connected.map(({ label }) => label).join(" · ")}
            </p>
            <p className="text-muted-foreground">{lastSync ? `Last sync ${moment(lastSync).fromNow()}` : "Waiting for the first sync"}</p>
          </div>
          <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing || isFetching} className="min-h-11 shrink-0">
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} aria-hidden="true" />
            {syncing ? "Syncing…" : "Sync now"}
          </Button>
        </div>
      )}
      {connected.length === 0 && !hasStatusIssue && showConnect && (
        <Link to="/import#devices" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium hover:underline">
          <Watch className="h-4 w-4 text-primary" aria-hidden="true" /> Connect a device
        </Link>
      )}
    </div>
  );
}
