import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

// Shown on the dashboard only when the athlete's COROS authorization has expired,
// so they find out immediately instead of discovering stale data later.
export default function CorosReconnectBanner() {
  const [needsReconnect, setNeedsReconnect] = useState(false);

  useEffect(() => {
    let active = true;
    base44.functions.invoke("corosSync", { action: "status" })
      .then((res) => { if (active) setNeedsReconnect(Boolean((res.data || res)?.needs_reconnect)); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  if (!needsReconnect) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-md border border-warning/40 bg-warning/10">
      <div className="flex items-start gap-2 flex-1">
        <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
        <p className="text-sm">Your COROS link expired, so new workouts and recovery data aren't syncing. Your history is safe.</p>
      </div>
      <Button asChild size="sm" className="min-h-[44px] w-full sm:w-auto">
        <Link to="/settings">Reconnect COROS</Link>
      </Button>
    </div>
  );
}