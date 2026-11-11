import React, { useState } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TodaySessionCardView } from "@/components/dashboard/TodaySessionCard";

// Preview-only synthetic fixtures. No athlete identifiers, API calls, tokens,
// auth providers or service providers are mounted on this route.
const sampleSession = {
  sport: "running",
  prescribed_duration_minutes: 50,
  prescribed_intensity_zone: "Z2",
  rationale_text: "Build aerobic endurance at a comfortable conversational effort.",
};
const samplePlan = { id: "synthetic-plan", pace_zones: [
  { zone: "Z2", pace_range: "5:30–6:15 min/km", hr_range: "135–150 bpm" },
] };
const sampleInjury = { level: "none", loading: false, evidence: [], summary: null };
const states = [
  { key: "workout", label: "Workout day" },
  { key: "no-workout", label: "Unscheduled day" },
  { key: "no-plan", label: "No plan" },
  { key: "error", label: "Load error" },
  { key: "hold", label: "Coach hold" },
];

export default function PreviewTodaySession() {
  const [selected, setSelected] = useState("workout");
  const [retried, setRetried] = useState(false);
  const mode = selected === "error" && retried ? "workout" : selected;
  const session = mode === "workout" || mode === "hold" ? sampleSession : null;
  const plan = mode === "no-plan" ? null : samplePlan;
  const injury = mode === "hold"
    ? { level: "hold", loading: false, summary: "Synthetic preview: running is paused pending coach review.", evidence: [] }
    : sampleInjury;

  return (
    <main className="mx-auto min-h-screen max-w-3xl space-y-6 px-4 py-8 text-foreground sm:px-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">TrainPaceLab · UI review</p>
        <h1 className="text-2xl font-heading font-bold sm:text-3xl">Today's Session — improved</h1>
        <p className="text-sm text-muted-foreground">
          This is the actual dashboard card presentation using synthetic example data.
          It is a visual preview, not your account or live training plan. Sign-in is
          intentionally disabled on this preview until the staging domain is approved.
        </p>
      </div>
      <div role="group" aria-label="Preview dashboard state" className="flex flex-wrap gap-2">
        {states.map(({ key, label }) => (
          <button key={key} type="button" aria-pressed={selected === key}
            onClick={() => { setSelected(key); setRetried(false); }}
            className={`min-h-10 rounded-md border px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected === key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-accent"}`}>
            {label}
          </button>
        ))}
      </div>
      <MemoryRouter initialEntries={["/preview/today"]}>
        <Routes>
          <Route path="/preview/today" element={
            <TodaySessionCardView session={session} plan={plan} injury={injury}
              biometricTelemetry={[]} loadError={mode === "error"}
              onRetry={() => setRetried(true)} />
          } />
          <Route path="/plan" element={
            <section className="rounded-lg border bg-card p-5 space-y-3">
              <h2 className="font-semibold">Training plan navigation</h2>
              <p className="text-sm text-muted-foreground">The real button navigates to /plan after authentication. This synthetic preview has no access to athlete records.</p>
              <button type="button" className="text-sm underline" onClick={() => window.location.reload()}>Back to card preview</button>
            </section>
          } />
        </Routes>
      </MemoryRouter>
      <p className="text-xs text-muted-foreground">Read-only synthetic preview · no Base44 requests · no athlete data · production unchanged</p>
    </main>
  );
}
