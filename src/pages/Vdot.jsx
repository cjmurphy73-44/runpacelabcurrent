import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gauge } from "lucide-react";
import { calculateVDOT, getTrainingPaces, getEquivalentTimes } from "@/math/vdot";

const DISTANCE_PRESETS = [
  { label: "5K", meters: 5000 },
  { label: "10K", meters: 10000 },
  { label: "Half Marathon", meters: 21097.5 },
  { label: "Marathon", meters: 42195 },
];

export default function Vdot() {
  const [distanceMeters, setDistanceMeters] = useState(5000);
  const [customKm, setCustomKm] = useState("5.0");
  const [isCustom, setIsCustom] = useState(false);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(22);
  const [seconds, setSeconds] = useState(30);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handlePreset = (m) => {
    setIsCustom(false);
    setDistanceMeters(m);
  };

  const handleCustomKm = (val) => {
    setCustomKm(val);
    const km = parseFloat(val);
    if (!isNaN(km) && km > 0) setDistanceMeters(km * 1000);
  };

  const handleCalculate = (e) => {
    e.preventDefault();
    setError(null);
    const total = hours * 3600 + minutes * 60 + seconds;
    if (total <= 0) return setError("Please enter a valid race duration.");
    if (!distanceMeters || distanceMeters <= 0) return setError("Please enter a valid race distance.");
    try {
      const vdot = calculateVDOT(total, distanceMeters);
      setResult({
        vdot,
        paces: getTrainingPaces(vdot),
        equiv: getEquivalentTimes(vdot),
      });
    } catch (err) {
      setError(err.message || "Calculation failed.");
    }
  };

  const paceEntries = result ? Object.entries(result.paces) : [];
  const equivEntries = result ? Object.entries(result.equiv) : [];

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-primary" /> Jack Daniels VDOT Calculator
          </CardTitle>
          <CardDescription>
            Enter a recent race performance to derive your current VDOT fitness index and optimal training pace zones.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleCalculate} className="space-y-6">
            <div>
              <Label className="mb-2 block">Race Distance</Label>
              <div className="flex flex-wrap gap-2 mb-3">
                {DISTANCE_PRESETS.map((p) => (
                  <Button
                    key={p.label}
                    type="button"
                    variant={!isCustom && distanceMeters === p.meters ? "default" : "secondary"}
                    size="sm"
                    onClick={() => handlePreset(p.meters)}
                  >
                    {p.label}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant={isCustom ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setIsCustom(true)}
                >
                  Custom
                </Button>
              </div>
              {isCustom && (
                <div className="flex items-center gap-2 max-w-xs">
                  <Input
                    type="number"
                    step="0.01"
                    min="0.1"
                    value={customKm}
                    onChange={(e) => handleCustomKm(e.target.value)}
                    placeholder="Distance in kilometers"
                  />
                  <span className="text-sm text-muted-foreground">km</span>
                </div>
              )}
            </div>

            <div>
              <Label className="mb-2 block">Race Time</Label>
              <div className="grid grid-cols-3 gap-3 max-w-xs">
                {[
                  { label: "Hours", value: hours, set: setHours, max: 24 },
                  { label: "Minutes", value: minutes, set: setMinutes, max: 59 },
                  { label: "Seconds", value: seconds, set: setSeconds, max: 59 },
                ].map((f) => (
                  <div key={f.label}>
                    <span className="text-xs text-muted-foreground">{f.label}</span>
                    <Input
                      type="number"
                      min="0"
                      max={f.max}
                      value={f.value}
                      onChange={(e) => f.set(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit">Calculate Training Paces</Button>
          </form>

          {result && (
            <div className="pt-6 border-t space-y-8">
              <div className="flex items-center justify-between p-6 rounded-xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-lg">
                <div>
                  <p className="text-xs uppercase tracking-wider text-blue-200">Calculated Score</p>
                  <h3 className="text-4xl font-extrabold">
                    {result.vdot.toFixed(1)} <span className="text-lg font-normal text-blue-200">VDOT</span>
                  </h3>
                </div>
                <div className="text-right text-xs text-blue-200">Jack Daniels Formula</div>
              </div>

              <div>
                <h4 className="font-heading font-bold text-lg mb-3">Training Pace Zones</h4>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {paceEntries.map(([key, z]) => (
                    <div key={key} className="p-4 bg-muted rounded-lg text-center">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">{key}</p>
                      <p className="text-xl font-bold mt-1">{z.formatted}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-heading font-bold text-lg mb-3">Equivalent Race Times</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {equivEntries.map(([dist, t]) => (
                    <div key={dist} className="p-3 bg-muted rounded-lg">
                      <p className="text-xs font-medium uppercase text-muted-foreground">{dist}</p>
                      <p className="text-base font-semibold mt-0.5">{t.formatted}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}