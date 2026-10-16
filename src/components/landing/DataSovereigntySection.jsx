import React from "react";
import { ShieldCheck, Lock, BrainCircuit, Download } from "lucide-react";
import Reveal from "@/components/landing/Reveal";

const GUARANTEES = [
  {
    icon: ShieldCheck,
    title: "Zero data mining. No ad networks.",
    body: "We never sell, license, or mine your telemetry. Your heart rate, GPS, and physiological curves exist solely to calculate your training models. We charge a direct, fair subscription price so you are the customer, not the product.",
  },
  {
    icon: Lock,
    title: "Database-level row-level security.",
    body: "Every workout, telemetry stream, and physiological parameter is guarded at the database level with strict Row-Level Security. Even if an API endpoint were misconfigured, the database engine itself rejects any query where the requesting user does not match the record's explicit owner.",
  },
  {
    icon: BrainCircuit,
    title: "No LLM data scrape. No model training.",
    body: "Your health telemetry and workout logs are never used to train public or private AI models. Our AI layer receives strictly anonymized, pre-calculated numeric state vectors (e.g. Form +34.3) purely to render a summary, keeping your raw health data entirely out of third-party AI databases.",
  },
  {
    icon: Download,
    title: "Absolute exportability & sovereignty.",
    body: "You own 100% of your data. Export your full telemetry history, ODE states, and calculated metrics at any time in open formats (JSON, CSV), or permanently purge your account with a single click. No hostaging your historical data.",
  },
];

export default function DataSovereigntySection() {
  return (
    <section className="border-y border-border bg-muted/40">
      <div className="max-w-6xl mx-auto px-4 py-16 sm:py-20">
        <div className="mb-12 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-3 py-1 text-xs font-medium text-success">
            <ShieldCheck className="w-3.5 h-3.5" /> Data Sovereignty Guarantee
          </span>
          <h2 className="mt-5 font-heading text-3xl sm:text-4xl font-bold">Your data, your science, zero exploitation</h2>
          <p className="mt-3 text-muted-foreground">
            Big fitness platforms treat your telemetry as raw material to mine, selling anonymized aggregates,
            training ML models on private routes, and serving ads against your health trends. TrainPaceLab is
            built differently — four ironclad guarantees that make your trust as rigorous as your training.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {GUARANTEES.map((g, i) => (
            <Reveal key={g.title} delay={(i % 2) * 0.08}>
              <div className="flex gap-4 rounded-lg border border-border bg-card p-6 h-full">
                <div className="shrink-0 w-10 h-10 rounded-md flex items-center justify-center bg-success/10 text-success">
                  <g.icon className="w-5 h-5" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-heading font-semibold text-base">{g.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{g.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}