import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Loader2, Link2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

// One dashboard banner for every connection that has stopped delivering data.
// Covers Garmin as well as COROS, says what stopped and what is safe, and starts
// re-authorization right here — no detour into settings just to find a button.
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
        // A failed check is unknown, not "expired" — never nag about a connection
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
    try {
      const res = await base44.functions.invoke(fn, { action: "authorize" });
      const data = res?.data || res;
      const url = data?.authorize_url;
      if (!url) throw new Error(data?.error || `Couldn't start the ${label} connection.`);
      if (window.self !== window.top) {
        const popup = window.open(url, "_blank");
        if (!popup) throw new Error("Your browser blocked the sign-in window. Allow pop-ups, or reconnect from Settings.");
        window.addEventListener("focus", () => setBusy(null), { once: true });
        return;
      }
      window.location.href = url;
    } catch (e) {
      setError(e?.response?.data?.error || e?.data?.error || e?.message || `Couldn't reconnect ${label}.`);
      setBusy(null);
    }
  };

  if (!broken.length) return null;

  return (
    <div className="p-3 rounded-md border border-warning/40 bg-warning/10 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
        <div className="min-w-0 space-y-1">
          <p className="text-sm">
            {broken.length === 1
              ? `Your ${broken[0].label} link expired, so new workouts and recovery data aren't syncing.`
              : `Your ${broken.map((b) => b.label).join(" and ")} links expired, so new workouts and recovery data aren't syncing.`}
          </p>
          <p className="text-xs text-muted-foreground">
            {broken.find((b) => b.reason)?.reason
              ? `${broken.find((b) => b.reason).reason} `
              : ""}Everything already imported is safe.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
        {broken.map((p) => (
          <Button
            key={p.fn}
            size="sm"
            onClick={() => reconnect(p)}
            disabled={busy === p.fn}
            className="min-h-[44px] w-full sm:w-auto"
          >
            {busy === p.fn
              ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              : <Link2 className="w-4 h-4 mr-2" />}
            Reconnect {p.label}
          </Button>
        ))}
        <Button asChild size="sm" variant="ghost" className="min-h-[44px] w-full sm:w-auto">
          <Link to="/settings">Connection details</Link>
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}