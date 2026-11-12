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
  const [unknown, setUnknown] = useState([]);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setChecking(true);
    try {
      const rows = await Promise.all(
        PROVIDERS.map(async ({ fn, label }) => {
          try {
            const res = await base44.functions.invoke(fn, { action: "status" });
            const s = res?.data || res || {};
            if (s?.needs_reconnect === true) return { fn, label, state: "expired", reason: s.last_error || null };
            if (s?.needs_reconnect === false || s?.connected === false) return { fn, label, state: "ok" };
            return { fn, label, state: "unknown" };
          } catch {
            // Unknown is not proof of a healthy connection or expired authorization.
            return { fn, label, state: "unknown" };
          }
        }),
      );
      setBroken(rows.filter((row) => row.state === "expired"));
      setUnknown(rows.filter((row) => row.state === "unknown"));
    } finally {
      setChecking(false);
    }
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
                {b.reason ||
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
              This does not mean recordings are up to date.
            </span>
          </div>
          <Button variant="outline" size="sm" className="min-h-[44px] w-full sm:w-auto shrink-0" onClick={load} disabled={checking}>
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