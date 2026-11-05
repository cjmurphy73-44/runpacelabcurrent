import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

// One dashboard banner for every connection that has stopped delivering data.
// Covers Garmin as well as COROS, and says what stopped, what is safe, and what
// to do — instead of leaving a stale-looking dashboard with no explanation.
export default function ConnectionHealthBanner() {
  const [broken, setBroken] = useState([]);

  useEffect(() => {
    let active = true;
    const read = async (fn, label) => {
      try {
        const res = await base44.functions.invoke(fn, { action: "status" });
        const s = res?.data || res || {};
        return s?.needs_reconnect ? { label, error: s.last_error || null } : null;
      } catch {
        return null;
      }
    };
    Promise.all([read("corosSync", "COROS"), read("garminSync", "Garmin")])
      .then((rows) => { if (active) setBroken(rows.filter(Boolean)); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  if (!broken.length) return null;

  const names = broken.map((b) => b.label).join(" and ");
  const reason = broken.find((b) => b.error)?.error;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-md border border-warning/40 bg-warning/10">
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm">
            Your {names} link expired, so new workouts and recovery data aren't syncing.
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {reason ? `${reason} ` : ""}Everything already imported is safe.
          </p>
        </div>
      </div>
      <Button asChild size="sm" className="min-h-[44px] w-full sm:w-auto shrink-0">
        <Link to="/settings">Reconnect {names}</Link>
      </Button>
    </div>
  );
}