import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Save } from "lucide-react";

export default function RecoveryCenterView() {
  const [metrics, setMetrics] = useState({
    hrv: "",
    sleepScore: "",
    restingHeartRate: "",
    readiness: ""
  });
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("rpl_recovery_metrics");
    if (saved) {
      setMetrics(JSON.parse(saved));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("rpl_recovery_metrics", JSON.stringify(metrics));
    window.dispatchEvent(new Event("training-plan-updated"));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Work In Progress</AlertTitle>
        <AlertDescription>
          Automated wearable integration (WHOOP, Oura, Garmin) is currently pending.
          Manual overrides are active.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Manual Recovery Log</CardTitle>
          <CardDescription>Enter your morning metrics to adjust today's training intensity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hrv">HRV (ms)</Label>
              <Input id="hrv" type="number" value={metrics.hrv} onChange={(e) => setMetrics({...metrics, hrv: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sleep">Sleep Score (%)</Label>
              <Input id="sleep" type="number" value={metrics.sleepScore} onChange={(e) => setMetrics({...metrics, sleepScore: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rhr">Resting HR (bpm)</Label>
              <Input id="rhr" type="number" value={metrics.restingHeartRate} onChange={(e) => setMetrics({...metrics, restingHeartRate: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="readiness">Readiness (1-10)</Label>
              <Input id="readiness" type="number" min="1" max="10" value={metrics.readiness} onChange={(e) => setMetrics({...metrics, readiness: e.target.value})} />
            </div>
          </div>
          <Button onClick={handleSave} className="w-full">
            <Save className="w-4 h-4 mr-2" /> {isSaved ? "Saved!" : "Save Manual Metrics"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}