import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LayoutGrid } from "lucide-react";
import { calculateHeartRateZones, calculatePaceZones } from "@/math/zones";

export default function Zones() {
  const [activeTab, setActiveTab] = useState("hr");

  const [maxHr, setMaxHr] = useState(185);
  const [restingHr, setRestingHr] = useState(55);
  const [useRestingHr, setUseRestingHr] = useState(true);

  const [paceMode, setPaceMode] = useState("threshold");
  const [tPaceMinutes, setTPaceMinutes] = useState(4);
  const [tPaceSeconds, setTPaceSeconds] = useState(15);
  const [vdotInput, setVdotInput] = useState(50);

  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleCalculate = (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (activeTab === "hr") {
        if (!maxHr || maxHr <= 0) throw new Error("Please enter a valid Maximum Heart Rate.");
        setResult({
          heartRateZones: calculateHeartRateZones(maxHr, useRestingHr && restingHr > 0 ? restingHr : undefined),
        });
      } else {
        if (paceMode === "threshold") {
          const t = tPaceMinutes * 60 + tPaceSeconds;
          if (t <= 0) throw new Error("Please enter a valid Threshold Pace.");
          setResult({ paceZones: calculatePaceZones({ thresholdPaceSecPerKm: t }) });
        } else {
          if (!vdotInput || vdotInput <= 0) throw new Error("Please enter a valid VDOT score.");
          setResult({ paceZones: calculatePaceZones({ vdot: vdotInput }) });
        }
      }
    } catch (err) {
      setError(err.message || "Calculation failed.");
    }
  };

  const hrZoneEntries =
    result?.heartRateZones
      ? Object.entries(result.heartRateZones).filter(([k]) => k.startsWith("zone"))
      : [];
  const paceEntries = result?.paceZones ? Object.entries(result.paceZones) : [];

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-primary" /> Training Zones Calculator
          </CardTitle>
          <CardDescription>
            Calculate physiological Heart Rate target ranges (Karvonen HR Reserve / %Max HR) or Daniels Pace Zones.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex border-b mb-2">
            {[
              { key: "hr", label: "Heart Rate Zones" },
              { key: "pace", label: "Pace Zones" },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setActiveTab(t.key);
                  setResult(null);
                  setError(null);
                }}
                className={`pb-3 px-6 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === t.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleCalculate} className="space-y-6">
            {activeTab === "hr" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1 block">Max Heart Rate (bpm)</Label>
                  <Input
                    type="number"
                    min="100"
                    max="240"
                    value={maxHr}
                    onChange={(e) => setMaxHr(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label>Resting Heart Rate (bpm)</Label>
                    <label className="inline-flex items-center text-xs text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useRestingHr}
                        onChange={(e) => setUseRestingHr(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary mr-1"
                      />
                      Use Karvonen
                    </label>
                  </div>
                  <Input
                    type="number"
                    min="30"
                    max="120"
                    disabled={!useRestingHr}
                    value={restingHr}
                    onChange={(e) => setRestingHr(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-4 mb-2">
                  <label className="inline-flex items-center text-sm font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="paceMode"
                      value="threshold"
                      checked={paceMode === "threshold"}
                      onChange={() => setPaceMode("threshold")}
                      className="text-primary focus:ring-primary mr-2"
                    />
                    Threshold Pace
                  </label>
                  <label className="inline-flex items-center text-sm font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="paceMode"
                      value="vdot"
                      checked={paceMode === "vdot"}
                      onChange={() => setPaceMode("vdot")}
                      className="text-primary focus:ring-primary mr-2"
                    />
                    VDOT Score
                  </label>
                </div>

                {paceMode === "threshold" ? (
                  <div className="max-w-xs">
                    <Label className="mb-1 block">Threshold Pace (per km)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="2"
                        max="15"
                        value={tPaceMinutes}
                        onChange={(e) => setTPaceMinutes(parseInt(e.target.value) || 0)}
                        placeholder="Min"
                      />
                      <span className="font-bold text-muted-foreground">:</span>
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        value={tPaceSeconds}
                        onChange={(e) => setTPaceSeconds(parseInt(e.target.value) || 0)}
                        placeholder="Sec"
                      />
                      <span className="text-sm font-medium text-muted-foreground">/km</span>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-xs">
                    <Label className="mb-1 block">VDOT Score</Label>
                    <Input
                      type="number"
                      min="15"
                      max="85"
                      step="0.1"
                      value={vdotInput}
                      onChange={(e) => setVdotInput(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit">Calculate Training Zones</Button>
          </form>

          {result && (
            <div className="pt-6 border-t space-y-6">
              {result.heartRateZones && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-heading font-bold text-lg">Heart Rate Target Zones</h3>
                    <Badge variant="secondary" className="uppercase">
                      {result.heartRateZones.method === "karvonen" ? "Karvonen (HRR)" : "% Max HR"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {hrZoneEntries.map(([key, zone]) => (
                      <div key={key} className="p-4 bg-muted rounded-lg text-center">
                        <p className="text-xs font-bold uppercase text-primary">{key.toUpperCase()}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{zone.name}</p>
                        <p className="text-xl font-extrabold mt-2">
                          {zone.minBpm} - {zone.maxBpm} <span className="text-xs font-normal text-muted-foreground">bpm</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.paceZones && (
                <div>
                  <h3 className="font-heading font-bold text-lg mb-4">Pace Training Zones</h3>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {paceEntries.map(([key, zone]) => (
                      <div key={key} className="p-4 bg-muted rounded-lg text-center">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">{zone.name}</p>
                        <p className="text-xl font-bold mt-1">{zone.formattedTargetPace}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}