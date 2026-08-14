import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CloudSun } from "lucide-react";
import { adjustPaceForEnvironment } from "@/math/environmental";

export default function WeatherAdjust() {
  const [paceMinutes, setPaceMinutes] = useState(4);
  const [paceSeconds, setPaceSeconds] = useState(30);
  const [tempUnit, setTempUnit] = useState("C");
  const [tempValue, setTempValue] = useState(28);
  const [relativeHumidity, setRelativeHumidity] = useState(75);
  const [altitudeMeters, setAltitudeMeters] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const switchUnit = (unit) => {
    if (unit === tempUnit) return;
    if (unit === "F") setTempValue(Math.round((tempValue * 9) / 5 + 32));
    else setTempValue(Math.round(((tempValue - 32) * 5) / 9));
    setTempUnit(unit);
  };

  const handleCalculate = (e) => {
    e.preventDefault();
    setError(null);
    const target = paceMinutes * 60 + paceSeconds;
    if (target <= 0) return setError("Please enter a valid target pace.");
    const temperatureC = tempUnit === "F" ? ((tempValue - 32) * 5) / 9 : tempValue;
    try {
      setResult(
        adjustPaceForEnvironment(target, {
          temperatureC: Math.round(temperatureC * 10) / 10,
          relativeHumidity,
          altitudeMeters: altitudeMeters || 0,
        })
      );
    } catch (err) {
      setError(err.message || "Calculation failed.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudSun className="w-5 h-5 text-accent-amber" /> Weather &amp; Altitude Pace Adjuster
          </CardTitle>
          <CardDescription>
            Adjust target running paces for heat stress, dew point, relative humidity, and altitude penalties.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleCalculate} className="space-y-6">
            <div>
              <Label className="mb-2 block">Target Pace (per km)</Label>
              <div className="flex items-center gap-3 max-w-xs">
                <div>
                  <span className="text-xs text-muted-foreground">Minutes</span>
                  <Input
                    type="number"
                    min="2"
                    max="15"
                    value={paceMinutes}
                    onChange={(e) => setPaceMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                  />
                </div>
                <span className="text-xl font-bold text-muted-foreground mt-4">:</span>
                <div>
                  <span className="text-xs text-muted-foreground">Seconds</span>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={paceSeconds}
                    onChange={(e) => setPaceSeconds(Math.max(0, parseInt(e.target.value) || 0))}
                  />
                </div>
                <span className="text-sm font-medium text-muted-foreground mt-4">/km</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Temperature</Label>
                  <div className="inline-flex rounded-md shadow-sm text-xs">
                    <button
                      type="button"
                      onClick={() => switchUnit("C")}
                      className={`px-2.5 py-1 rounded-l-md font-semibold ${tempUnit === "C" ? "bg-accent-amber text-white" : "bg-muted text-muted-foreground"}`}
                    >
                      °C
                    </button>
                    <button
                      type="button"
                      onClick={() => switchUnit("F")}
                      className={`px-2.5 py-1 rounded-r-md font-semibold ${tempUnit === "F" ? "bg-accent-amber text-white" : "bg-muted text-muted-foreground"}`}
                    >
                      °F
                    </button>
                  </div>
                </div>
                <Input
                  type="number"
                  value={tempValue}
                  onChange={(e) => setTempValue(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Relative Humidity</Label>
                  <span className="text-sm font-bold text-accent-amber">{relativeHumidity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={relativeHumidity}
                  onChange={(e) => setRelativeHumidity(parseInt(e.target.value))}
                  className="w-full accent-amber-600 mt-2"
                />
              </div>

              <div>
                <Label className="mb-2 block">Altitude (meters)</Label>
                <Input
                  type="number"
                  min="0"
                  max="9000"
                  step="50"
                  value={altitudeMeters}
                  onChange={(e) => setAltitudeMeters(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="0 (Sea Level)"
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit">Adjust Pace</Button>
          </form>

          {result && (
            <div className="pt-6 border-t space-y-6">
              <div className="flex flex-col md:flex-row items-center justify-between p-6 bg-gradient-to-r from-amber-600 to-orange-700 text-white rounded-xl shadow-lg gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-amber-100">Environmentally Adjusted Pace</p>
                  <h3 className="text-4xl font-extrabold mt-1">{result.formattedAdjustedPace}</h3>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-sm font-bold">
                    +{result.paceImpactSecondsPerKm} sec/km slowdown
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Dew Point", value: `${result.dewPointC}°C (${result.dewPointF}°F)` },
                  { label: "Heat Stress", value: `${((result.heatStressFactor - 1) * 100).toFixed(1)}%` },
                  { label: "Altitude Impact", value: `${((result.altitudeFactor - 1) * 100).toFixed(1)}%` },
                  { label: "Total Pace Multiplier", value: `${result.totalPaceMultiplier}x` },
                ].map((c) => (
                  <div key={c.label} className="p-4 bg-muted rounded-lg">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">{c.label}</p>
                    <p className="text-xl font-bold mt-1">{c.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}