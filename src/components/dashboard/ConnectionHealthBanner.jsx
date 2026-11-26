import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle, RefreshCw } from "lucide-react";

export default function ConnectionHealthBanner({ broken, unknown, checking, onRefresh }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  const reconnect = async ({ fn, label }) => {
    setBusy(fn);
    setError(null);
    try {
      const res = await base44.functions.invoke(fn, { action: "authorize" });
      const data = res?.data || res;
      const url = data?.authorize_url;
      if (!url) throw new Error(data?.error || `Could not start the ${label} connection.`);
      // A cross-site OAuth redirect must run top-level so the provider's state
      // cookie survives; inside the builder preview open a real window instead.
      if (window.self !== window.top) {
        const popup = window.open(url, "_blank");
        if (!popup) throw new Error("Your browser blocked the window. Allow pop-ups and try again.");
        popup.opener = null;
        window.addEventListener("focus", () => { onRefresh(); setBusy(null); }, { once: true });
        return;
      }
      window.location.assign(url);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || `Could not start the ${label} reconnect.`);
      setBusy(null);
    }
  };

  if (!broken.length && !unknown.length) return null;

  return (
    <div className="space-y-2">
      {broken.map((b) => (
        <div
          key={b.fn}
          className="flex items-start justify-between gap-3 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div>
              <p className="font-medium">{b.label} stopped syncing</p>
              <p className="text-xs text-muted-foreground">
                {b.status?.last_error ||
                  "The authorization expired. New workouts and recovery data resume once you reconnect."}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px] shrink-0 text-xs"
            onClick={() => reconnect(b)}
            disabled={busy === b.fn}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${busy === b.fn ? "animate-spin" : ""}`} />
            Reconnect
          </Button>
        </div>
      ))}
      {unknown.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-md border border-border bg-muted/40 p-3" role="status">
          <div className="flex items-start gap-2 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" aria-hidden="true" />
            <span>
              Could not verify {unknown.map((provider) => provider.label).join(" and ")} sync status.
            </span>
          </div>
          <Button variant="outline" size="sm" className="min-h-[44px] w-full sm:w-auto shrink-0" onClick={onRefresh} disabled={checking}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} aria-hidden="true" />
            Check again
          </Button>
        </div>
      )}
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}
