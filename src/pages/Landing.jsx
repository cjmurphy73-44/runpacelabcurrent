import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, BrainCircuit, Watch, Sparkles, Users, ShieldCheck, ArrowRight, Check, Dumbbell, CalendarClock } from "lucide-react";
import { PLAN_TIERS, PLAN_DETAILS } from "@/lib/subscriptionFeatures";
import PublicFooter from "@/components/layout/PublicFooter";

const FEATURES = [
  { icon: BrainCircuit, title: "Adaptive physiology engine", body: "Daily CTL/ATL/TSB modeling, HR-based TRIMP, and VDOT calibration that reshapes your plan as you train." },
  { icon: Watch, title: "Wearable sync", body: "Pull full history from Garmin, Strava, and COROS. Multi-file reconciliation unifies FIT, TCX, and CSV into one master record." },
  { icon: Sparkles, title: "AI coach", body: "Post-workout insights, micro-adjustments, and race strategy grounded in your real telemetry — not generic advice." },
  { icon: Users, title: "Coach workspace", body: "Manage a roster, compare athletes side-by-side, and assign plans. Built for squads and individual coaches alike." },
  { icon: ShieldCheck, title: "Injury-aware loading", body: "Your injury history shapes prehab routines and load caps so the plan pushes you forward without breaking you." },
  { icon: Dumbbell, title: "Structured workout export", body: "Send .fit workouts straight to your watch so prescribed intervals land on your wrist, ready to run." },
];

export default function Landing() {
  const { user } = useAuth();
  const cta = user ? { to: "/", label: "Go to dashboard" } : { to: "/register", label: "Get started free" };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/landing" className="flex items-center gap-2 font-heading font-bold text-lg">
            <Activity className="w-5 h-5 text-primary" />
            <span>TrainPaceLab</span>
          </Link>
          <div className="flex items-center gap-2">
            {!user && <Button asChild variant="ghost" size="sm"><Link to="/login">Sign in</Link></Button>}
            <Button asChild size="sm"><Link to={cta.to}>{cta.label}</Link></Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-dots opacity-40 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 py-20 sm:py-28 relative">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
              <Sparkles className="w-3.5 h-3.5" /> Elite athletic intelligence
            </span>
            <h1 className="mt-5 font-heading text-4xl sm:text-6xl font-bold tracking-tight">
              Train to your physiology, not a template.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-2xl">
              TrainPaceLab turns your wearable data, recovery metrics, and race history into adaptive,
              data-driven training plans — recalibrated every session by an AI coach that reads your real numbers.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg"><Link to={cta.to}>{cta.label}<ArrowRight className="w-4 h-4" /></Link></Button>
              <Button asChild variant="outline" size="lg"><Link to="/subscribe"><CalendarClock className="w-4 h-4" />See pricing</Link></Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Free tier forever. No card required.</p>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <CardContent className="p-6">
                <div className="w-10 h-10 rounded-md bg-accent text-accent-foreground flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-heading font-semibold text-lg">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold">Simple pricing</h2>
          <p className="mt-2 text-muted-foreground">Start free. Upgrade when you outgrow it.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3 items-start">
          {PLAN_TIERS.map((tier) => {
            const d = PLAN_DETAILS[tier];
            return (
              <Card key={tier} className={d.highlighted ? "border-primary shadow-md" : ""}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading font-semibold text-lg">{d.label}</h3>
                    {d.highlighted && <span className="text-[10px] font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Popular</span>}
                  </div>
                  <p className="text-sm text-muted-foreground">{d.tagline}</p>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-bold font-heading">{d.price}</span>
                    <span className="text-sm text-muted-foreground">/{d.cadence}</span>
                  </div>
                  <ul className="mt-5 space-y-2">
                    {d.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild variant={d.highlighted ? "default" : "outline"} className="w-full mt-6">
                    <Link to={cta.to}>{user ? "Your account" : `Start with ${d.label}`}</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="rounded-lg border border-border bg-accent p-10 text-center">
          <h2 className="font-heading text-3xl font-bold">Ready to train smarter?</h2>
          <p className="mt-2 text-muted-foreground">Connect your wearables and get your first adaptive plan in minutes.</p>
          <Button asChild size="lg" className="mt-6"><Link to={cta.to}>{cta.label}<ArrowRight className="w-4 h-4" /></Link></Button>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}