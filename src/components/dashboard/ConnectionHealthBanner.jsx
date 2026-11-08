import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle, RefreshCw } from "lucide-react";

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

  const load = useCallback(async () => {
    const rows = await Promise.all(
      PROVIDERS.map(async ({ fn, label }) => {
        try {
          const res = await base44.functions.invoke(fn, { action: "status" });
          const s = res?.data || res || {};
          return s?.needs_reconnect ? { fn, label, reason: s.last_error || null } : null;
        } catch {
          // A failed check is unknown, not "expired", never nag about a connection
          // we couldn't read.
          return null;
        }
      }),
    );
    setBroken(rows.filter(Boolean));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
        window.addEventListener("focus", () => { load(); setBusy(null); }, { once: true });
        return;
      }
      window.location.assign(url);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || `Could not start the ${label} reconnect.`);
      setBusy(null);
    }
  };

  if (!broken.length) return null;

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
                {b.reason ||
                  "The authorization expired. New workouts and recovery data resume once you reconnect."}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 shrink-0 text-xs"
            onClick={() => reconnect(b)}
            disabled={busy === b.fn}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${busy === b.fn ? "animate-spin" : ""}`} />
            Reconnect
          </Button>
        </div>
      ))}
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}