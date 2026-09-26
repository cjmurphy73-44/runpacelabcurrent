// src/hooks/useExceptionSynthesis.ts
// Calls the Pro-gated synthesizeExceptions backend function and returns the
// exception-based AI synthesis for the dashboard card. Auto-runs once per
// athlete; exposes a manual refresh.

import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import type { SynthesisResult } from "@/services/contracts/canonicalSample";

export function useExceptionSynthesis(athleteId: string | null | undefined) {
  const [data, setData] = useState<SynthesisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gated, setGated] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  const run = useCallback(async () => {
    if (!athleteId) return;
    setLoading(true);
    setError(null);
    setGated(false);
    setRateLimited(false);
    try {
      const res = await base44.functions.invoke("synthesizeExceptions", { athlete_id: athleteId });
      const d = res?.data || {};
      if (d.gated) { setGated(true); setData(null); return; }
      if (d.rateLimited) { setRateLimited(true); setData(null); return; }
      if (d.error) { setError(d.error); setData(null); return; }
      setData({
        anomalies: d.anomalies || [],
        synthesisText: d.synthesisText || "",
        confidence: d.confidence || "medium",
        asOf: d.asOf || new Date().toISOString(),
        empty: d.empty,
      });
    } catch (e: any) {
      setError(e?.message || "Couldn't generate your synthesis right now.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    if (athleteId) run();
  }, [athleteId, run]);

  return { data, loading, error, gated, rateLimited, refresh: run };
}