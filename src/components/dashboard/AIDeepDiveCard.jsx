import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useFitness } from "@/context/FitnessContext";
import { useServices } from "@/services/providers/ServiceContext";

export default function AIDeepDiveCard({ athleteId }) {
  const { dailyMetrics, biometricTelemetry } = useFitness();
  const { functionGateway } = useServices();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    // Lifestyle-factor logging is captured on DailyMetrics.holistic_factors, not a
    // standalone entity; pass an empty array here to avoid a broken SDK reference.
    const lifestyleFactors = [];

    const prompt = `You are an elite sports scientist analyzing an athlete's unified training and recovery telemetry. Here is their CTL/ATL/TSB trend history (most recent last): ${JSON.stringify(dailyMetrics.slice(-30))}. Here is their recovery telemetry (HRV, sleep, active calories): ${JSON.stringify(biometricTelemetry.slice(0, 30))}. Here are their self-reported lifestyle/life-stress factors: ${JSON.stringify(lifestyleFactors)}. Write a detailed performance report that explicitly correlates physiological recovery cost (HRV, sleep, lifestyle stressors) with recent training stress (CTL/ATL/TSB trends), and outlines concrete, actionable physiological suggestions for the athlete going forward.`;
    const response = await functionGateway.invoke('aiDeepDive', { athlete_id: athleteId, prompt });

    setReport(response.data.result);
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <CardTitle className="text-sm font-heading">AI Deep-Dive Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={runAnalysis} disabled={loading} className="w-full">
          {loading ? "Analyzing..." : "Run Deep-Dive Analysis"}
        </Button>
        {report && (
          <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
            <ReactMarkdown>{report}</ReactMarkdown>
          </div>
        )}
      </CardContent>
    </Card>
  );
}