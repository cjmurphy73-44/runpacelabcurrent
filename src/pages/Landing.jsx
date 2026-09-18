import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Image } from "@/components/ui/image";
import {
  Activity, BrainCircuit, Watch, Sparkles, Users, ShieldCheck, Dumbbell,
  CalendarClock, ArrowRight, Check, LineChart, HeartPulse,
} from "lucide-react";
import { PLAN_TIERS, PLAN_DETAILS } from "@/lib/subscriptionFeatures";
import PublicFooter from "@/components/layout/PublicFooter";
import ProductPreview from "@/components/landing/ProductPreview";

const HERO_IMG = "https://media.base44.com/images/public/6a504ebe6a5a6d1be058226c/8d3ccd7c8_generated_image.png";
const WATCH_IMG = "https://media.base44.com/images/public/6a504ebe6a5a6d1be058226c/dd24180dd_generated_image.png";

const FEATURES = [
  { icon: BrainCircuit, title: "Adaptive physiology engine", body: "Daily CTL/ATL/TSB modeling, HR-based TRIMP, and VDOT calibration that reshapes your plan as you train." },
  { icon: Watch, title: "Wearable sync", body: "Pull full history from Garmin, Strava, and COROS. Multi-file reconciliation unifies FIT, TCX, and CSV into one master record." },
  { icon: Sparkles, title: "AI coach", body: "Post-workout insights, micro-adjustments, and race strategy grounded in your real telemetry — not generic advice." },
  { icon: Users, title: "Coach workspace", body: "Manage a roster, compare athletes side-by-side, and assign plans. Built for squads and individual coaches alike." },
  { icon: ShieldCheck, title: "Injury-aware loading", body: "Your injury history shapes prehab routines and load caps so the plan pushes you forward without breaking you." },
  { icon: Dumbbell, title: "Structured workout export", body: "Send .fit workouts straight to your watch so prescribed intervals land on your wrist, ready to run." },
];

const STEPS = [
  { icon: Watch, title: "Connect your wearables", body: "Sync full history from Garmin, Strava, or COROS. Multi-file reconciliation unifies FIT, TCX, and CSV into one clean record." },
  { icon: BrainCircuit, title: "We model your physiology", body: "Daily CTL/ATL/TSB, HR-based TRIMP, and VDOT calibration build a living picture of your fitness and fatigue." },
  { icon: Sparkles, title: "Get an adaptive plan + AI coach", body: "Your plan reshapes every session as you train. An AI coach reads your real numbers and adjusts — not generic templates." },
];

const FAQ = [
  { q: "Do I need a paid plan to try it?", a: "No. The free tier gives you the dashboard, physiology lab, single-wearable sync (30-day lookback), and 5 AI coach messages a week. Upgrade only when you want full history, adaptive re-planning, and structured workout export." },
  { q: "Which wearables are supported?", a: "Garmin, Strava, and COROS have direct sync. Oura, Whoop, Withings, Polar, Fitbit, and Suunto are supported via a vendor-agnostic pipeline. You can also upload FIT, TCX, or CSV files manually." },
  { q: "Is this only for runners?", a: "No. TrainPaceLab is multi-sport — running, cycling, swimming, triathlon, and strength all feed the same physiology model so your training load reflects everything you do." },
  { q: "How is this different from a generic plan?", a: "Generic plans assume an average athlete. TrainPaceLab recalibrates off your actual telemetry — heart rate, pace, recovery, and race history — so the plan adapts when you're undertrained, fatigued, or peaking." },
  { q: "What does the AI coach actually do?", a: "It generates post-workout insights, suggests micro-adjustments, builds race strategy, and produces training plans grounded in your real data — not internet-generic advice." },
  { q: "Can I get access without paying during the beta?", a: "Yes. If you have an access code from the team, redeem it on the pricing page for instant full access until the code's expiry — no checkout required." },
];

export default function Landing() {
  const { user } = useAuth();
  const cta = user ? { to: "/app", label: "Go to dashboard" } : { to: "/register", label: "Get started free" };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-black bg-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-heading font-bold text-lg text-black">
            <Activity className="w-5 h-5 text-blue-700" />
            <span>TrainPaceLab</span>
          </Link>
          <div className="flex items-center gap-2">
            {!user && <Button asChild variant="ghost" size="sm" className="text-black hover:bg-slate-100"><Link to="/login">Sign in</Link></Button>}
            <Button asChild size="sm" className="bg-blue-700 text-white hover:bg-blue-800 rounded-none font-bold"><Link to={cta.to}>{cta.label}</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-dots opacity-40 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-24 relative">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                <Sparkles className="w-3.5 h-3.5" /> Elite athletic intelligence
              </span>
              <h1 className="mt-5 font-heading text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05]">
                Train to your physiology, not a template.
              </h1>
              <p className="mt-5 text-lg text-muted-foreground max-w-lg">
                TrainPaceLab turns your wearable data, recovery metrics, and race history into adaptive,
                data-driven training plans — recalibrated every session by an AI coach that reads your real numbers.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg">{cta.label === "Go to dashboard" ? <Link to="/app">{cta.label}<ArrowRight className="w-4 h-4" /></Link> : <Link to="/register">{cta.label}<ArrowRight className="w-4 h-4" /></Link>}</Button>
                <Button asChild variant="outline" size="lg"><Link to="/subscribe"><CalendarClock className="w-4 h-4" />See pricing</Link></Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">Free tier forever. No card required.</p>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-grid-dots opacity-30 pointer-events-none rounded-lg" />
              <Image
                src={HERO_IMG}
                alt="Endurance runner on a misty mountain road at dawn"
                fittingType="fill"
                className="rounded-lg border border-border shadow-xl w-full aspect-[4/3]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="text-center mb-10">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold">How it works</h2>
            <p className="mt-2 text-muted-foreground">Three steps from raw data to a plan that fits you.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <Card key={s.title} className="relative">
                <CardContent className="p-6">
                  <div className="w-10 h-10 rounded-md bg-accent text-accent-foreground flex items-center justify-center mb-4">
                    <s.icon className="w-5 h-5" />
                  </div>
                  <span className="absolute top-6 right-6 text-3xl font-bold font-heading text-border">{i + 1}</span>
                  <h3 className="font-heading font-semibold text-lg pr-8">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Product showcase */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <ProductPreview />
          <div className="max-w-lg">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold">A dashboard that reads your body</h2>
            <p className="mt-4 text-muted-foreground">
              Fitness, fatigue, and form update daily from your real sessions and recovery. Readiness blends sleep,
              HRV, resting heart rate, and training stress into one number — so you know whether to push or back off
              before you lace up.
            </p>
            <ul className="mt-5 space-y-2">
              {["Daily CTL/ATL/TSB from HR-based TRIMP", "Holistic readiness from wearables", "VDOT & threshold-pace calibration", "Aerobic decoupling & efficiency factor"].map((t) => (
                <li key={t} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <Button asChild variant="outline" className="mt-6"><Link to="/app">Explore the dashboard<ArrowRight className="w-4 h-4" /></Link></Button>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="border-t border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="text-center mb-10">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold">Built for serious training</h2>
            <p className="mt-2 text-muted-foreground">Everything you need to train smarter and recover better.</p>
          </div>
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
        </div>
      </section>

      {/* Concept / rationale */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div className="max-w-lg order-2 lg:order-1">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
              <LineChart className="w-3.5 h-3.5" /> Why it matters
            </span>
            <h2 className="mt-4 font-heading text-3xl sm:text-4xl font-bold">Generic plans peak the average athlete. You aren't average.</h2>
            <p className="mt-4 text-muted-foreground">
              Most training plans are built for a statistical midpoint. They can't tell when your fitness is surging,
              when fatigue is quietly accumulating, or when a bad night's sleep means today's threshold session should
              become an easy day. TrainPaceLab models your actual physiology — the load you've carried, the recovery
              you've banked, the pace your heart says you can hold — and adjusts the plan around reality.
            </p>
            <p className="mt-3 text-muted-foreground">
              The result is a plan that pushes when you're ready to absorb it and pulls back when you're not, so you
              arrive at your race fit, fresh, and healthy.
            </p>
          </div>
          <Image
            src={WATCH_IMG}
            alt="Runner's GPS watch showing pace and heart rate data"
            fittingType="fill"
            className="rounded-lg border border-border shadow-lg w-full aspect-[4/3] order-1 lg:order-2"
          />
        </div>
      </section>

      {/* Pricing summary */}
      <section className="border-t border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="text-center mb-10">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold">Simple pricing</h2>
            <p className="mt-2 text-muted-foreground">Start free. Upgrade when you outgrow it.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-start">
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
                      <Link to={cta.label === "Go to dashboard" ? "/app" : "/subscribe"}>{user ? "Your account" : `Start with ${d.label}`}</Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold">Questions</h2>
        </div>
        <Accordion type="single" collapsible>
          {FAQ.map((item, i) => (
            <AccordionItem key={i} value={`q-${i}`}>
              <AccordionTrigger>{item.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Final CTA */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="rounded-lg border border-border bg-accent p-10 text-center">
          <h2 className="font-heading text-3xl font-bold">Ready to train smarter?</h2>
          <p className="mt-2 text-muted-foreground">Connect your wearables and get your first adaptive plan in minutes.</p>
          <Button asChild size="lg" className="mt-6">
            <Link to={cta.label === "Go to dashboard" ? "/app" : "/register"}>{cta.label}<ArrowRight className="w-4 h-4" /></Link>
          </Button>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}