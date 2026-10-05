import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Image } from "@/components/ui/image";
import {
  Activity, BrainCircuit, Watch, Sparkles, Users, ShieldCheck, Dumbbell,
  CalendarClock, ArrowRight, Check, LineChart, Quote,
} from "lucide-react";
import { PLAN_TIERS, PLAN_DETAILS } from "@/lib/subscriptionFeatures";
import ProductPreview from "@/components/landing/ProductPreview";
import PublicFooter from "@/components/layout/PublicFooter";

const HERO_IMG = "https://media.base44.com/images/public/6a504ebe6a5a6d1be058226c/b0f9ec0cb_generated_image.png";
const STEP_IMGS = [
  "https://media.base44.com/images/public/6a504ebe6a5a6d1be058226c/5d8b0ba99_generated_image.png",
  "https://media.base44.com/images/public/6a504ebe6a5a6d1be058226c/278dabff2_generated_image.png",
  "https://media.base44.com/images/public/6a504ebe6a5a6d1be058226c/b1b4383a8_generated_image.png",
];
const TESTIMONIAL_IMG = "https://media.base44.com/images/public/6a504ebe6a5a6d1be058226c/8168e0ad1_generated_image.png";
const CONCEPT_IMG = "https://media.base44.com/images/public/6a504ebe6a5a6d1be058226c/dd24180dd_generated_image.png";

const FEATURES = [
  { icon: BrainCircuit, title: "Adaptive physiology engine", body: "Daily CTL/ATL/TSB modeling, HR-based TRIMP, and VDOT calibration that reshapes your plan as you train." },
  { icon: Watch, title: "Wearable sync", body: "Automatic workout and recovery sync from COROS today. Recovery sync from Oura, WHOOP, Polar, Withings, and Fitbit is ready once credentials are configured. Garmin and Strava direct sync is coming soon — upload FIT, TCX, or CSV from any device in the meantime. Multi-file reconciliation unifies them into one master record." },
  { icon: Sparkles, title: "AI coach", body: "Post-workout insights, micro-adjustments, and race strategy grounded in your real telemetry — not generic advice." },
  { icon: Users, title: "Coach workspace", body: "Manage a roster, compare athletes side-by-side, and assign plans. Built for squads and individual coaches alike." },
  { icon: ShieldCheck, title: "Injury-aware loading", body: "Your injury history shapes prehab routines and load caps so the plan pushes you forward without breaking you." },
  { icon: Dumbbell, title: "Structured workout export", body: "Send .fit workouts straight to your watch so prescribed intervals land on your wrist, ready to run." },
];

const STEPS = [
  { icon: Watch, title: "Connect your wearables", body: "Sync COROS automatically today, or upload FIT, TCX, and CSV from any watch. Recovery sync from Oura, WHOOP, Polar, Withings, and Fitbit is ready once credentials are configured. Garmin and Strava direct sync is coming soon." },
  { icon: BrainCircuit, title: "We model your physiology", body: "Daily CTL/ATL/TSB, HR-based TRIMP, and VDOT calibration build a living picture of your fitness and fatigue." },
  { icon: Sparkles, title: "Get an adaptive plan + AI coach", body: "Your plan reshapes every session as you train. An AI coach reads your real numbers and adjusts — not generic templates." },
];

const FAQ = [
  { q: "Do I need a paid plan to try it?", a: "No. The free tier gives you the dashboard, physiology lab, single-wearable sync (30-day lookback), and 5 AI coach messages a week. Upgrade only when you want full history, adaptive re-planning, and structured workout export." },
  { q: "Which wearables are supported?", a: "COROS has direct automated sync today (workouts + recovery). Recovery sync from Oura, WHOOP, Polar, Withings, and Fitbit is built and ready once the team adds each provider's credentials. Garmin and Strava direct sync is coming soon — for now, upload FIT, TCX, or CSV files from any device, or use a COROS watch as a bridge. Multi-file reconciliation unifies them into one master record." },
  { q: "Is this only for runners?", a: "No. TrainPaceLab is multi-sport — running, cycling, swimming, triathlon, and strength all feed the same physiology model so your training load reflects everything you do." },
  { q: "How is this different from a generic plan?", a: "Generic plans assume an average athlete. TrainPaceLab recalibrates off your actual telemetry — heart rate, pace, recovery, and race history — so the plan adapts when you're undertrained, fatigued, or peaking." },
  { q: "What does the AI coach actually do?", a: "It generates post-workout insights, suggests micro-adjustments, builds race strategy, and produces training plans grounded in your real data — not internet-generic advice." },
  { q: "Can I get access without paying during the beta?", a: "Yes. If you have an access code from the team, redeem it on the pricing page for instant full access until the code's expiry — no checkout required." },
];

export default function Landing() {
  const { user } = useAuth();
  const cta = user ? { to: "/app", label: "Go to dashboard" } : { to: "/register", label: "Get started free" };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur pt-safe">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-heading font-bold text-lg">
            <Activity className="w-5 h-5 text-primary" />
            <span>TrainPaceLab</span>
          </Link>
          <div className="flex items-center gap-2">
            {!user && (
              <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <Link to="/login">Sign in</Link>
              </Button>
            )}
            <Button asChild size="sm" className="font-bold">
              <Link to={cta.to}>{cta.label}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-dots opacity-20 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-24 relative">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
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
                <Button asChild size="lg" className="gap-2">
                  <Link to={cta.to}>{cta.label}<ArrowRight className="w-4 h-4" /></Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="gap-2">
                  <Link to="/subscribe"><CalendarClock className="w-4 h-4" />See pricing</Link>
                </Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">Free tier forever. No card required.</p>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-grid-dots opacity-10 pointer-events-none rounded-lg" />
              <Image
                src={HERO_IMG}
                alt="Runner sprinting through a low-light urban environment"
                fittingType="fill"
                className="rounded-lg border border-border shadow-2xl w-full aspect-[4/3]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Product showcase */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="max-w-2xl mb-10">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <LineChart className="w-3.5 h-3.5" /> The dashboard
          </span>
          <h2 className="mt-4 font-heading text-3xl sm:text-4xl font-bold">A dashboard that reads your body</h2>
          <p className="mt-3 text-muted-foreground">
            Fitness, fatigue, and form update daily from your real sessions and recovery. Readiness blends sleep,
            HRV, resting heart rate, and training stress into one number — so you know whether to push or back off
            before you lace up.
          </p>
        </div>
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <ProductPreview />
          <ul className="space-y-3">
            {["Daily CTL/ATL/TSB from HR-based TRIMP", "Holistic readiness from wearables", "VDOT & threshold-pace calibration", "Aerobic decoupling & efficiency factor"].map((t) => (
              <li key={t} className="flex items-start gap-3 text-base">
                <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center bg-primary/15">
                  <Check className="w-3.5 h-3.5 text-primary" />
                </span>
                <span>{t}</span>
              </li>
            ))}
            <li>
              <Button asChild variant="outline" className="mt-2 gap-2">
                <Link to="/app">Explore the dashboard<ArrowRight className="w-4 h-4" /></Link>
              </Button>
            </li>
          </ul>
        </div>
      </section>

      {/* How it works — three photo-led steps */}
      <section className="border-y border-border bg-muted/40">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="mb-10">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold">Three steps from raw data to a plan that fits you</h2>
            <p className="mt-2 text-muted-foreground">Documented, not templated.</p>
          </div>
          <div className="space-y-6">
            {STEPS.map((s, i) => {
              const flip = i % 2 === 1;
              return (
                <div key={s.title} className="grid md:grid-cols-2 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
                  <div className={flip ? "md:order-2" : ""}>
                    <Image
                      src={STEP_IMGS[i]}
                      alt={s.title}
                      fittingType="fill"
                      className="w-full h-64 md:h-full"
                    />
                  </div>
                  <div className={`p-8 sm:p-10 flex flex-col justify-center ${flip ? "md:order-1" : ""}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="font-heading text-4xl font-bold text-primary">{i + 1}</span>
                      <span className="w-10 h-10 rounded-md flex items-center justify-center bg-primary/10 text-primary">
                        <s.icon className="w-5 h-5" />
                      </span>
                    </div>
                    <h3 className="font-heading font-semibold text-2xl">{s.title}</h3>
                    <p className="mt-3 text-muted-foreground">{s.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonial / pull quote */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-5 gap-10 items-center">
          <div className="lg:col-span-3">
            <Quote className="w-12 h-12 mb-5 text-primary" />
            <p className="font-heading text-2xl sm:text-3xl font-semibold leading-snug">
              "My plan actually understands how tired I am, not just what day it is."
            </p>
            <p className="mt-5 text-sm font-medium uppercase tracking-wider text-primary">Sarah — Elite Marathoner</p>
          </div>
          <div className="lg:col-span-2">
            <Image
              src={TESTIMONIAL_IMG}
              alt="Portrait of an endurance athlete resting after a run"
              fittingType="fill"
              className="w-full aspect-[4/5] shadow-xl rounded-lg border border-border"
            />
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="border-t border-border bg-muted/40">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="mb-10">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold">Built for serious training</h2>
            <p className="mt-2 text-muted-foreground">Everything you need to train smarter and recover better.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title} className="bg-card">
                <CardContent className="p-6">
                  <div className="w-10 h-10 rounded-md flex items-center justify-center mb-4 bg-primary/10 text-primary">
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
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
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
            src={CONCEPT_IMG}
            alt="Runner's GPS watch showing pace and heart rate data"
            fittingType="fill"
            className="rounded-lg border border-border shadow-lg w-full aspect-[4/3] order-1 lg:order-2"
          />
        </div>
      </section>

      {/* Pricing summary */}
      <section className="border-t border-border bg-muted/40">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="mb-10">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold">Simple pricing</h2>
            <p className="mt-2 text-muted-foreground">Start free. Upgrade when you outgrow it.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-start">
            {PLAN_TIERS.map((tier) => {
              const d = PLAN_DETAILS[tier];
              return (
                <Card key={tier} className={`bg-card ${d.highlighted ? "border-primary shadow-md shadow-primary/20" : ""}`}>
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex items-center justify-between">
                      <h3 className="font-heading font-semibold text-lg">{d.label}</h3>
                      {d.highlighted && <span className="text-[10px] font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Popular</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">{d.tagline}</p>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-3xl font-bold font-heading">{d.price}</span>
                      <span className="text-sm text-muted-foreground">/{d.cadence}</span>
                    </div>
                    <ul className="mt-5 space-y-2 flex-1">
                      {d.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button asChild variant={d.highlighted ? "default" : "outline"} className="w-full mt-6">
                      <Link to={user ? "/app" : tier === "free" ? "/register" : "/subscribe"}>{user ? "Your account" : `Start with ${d.label}`}</Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="mb-10">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold">Questions</h2>
          <p className="mt-2 text-muted-foreground">Straight answers, no fine print.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-x-12 gap-y-8">
          {FAQ.map((item, i) => (
            <div key={i}>
              <h3 className="font-heading font-semibold text-base mb-2">{item.q}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA banner */}
      <section className="bg-primary">
        <div className="max-w-6xl mx-auto px-4 py-14 text-center text-primary-foreground">
          <h2 className="font-heading text-3xl font-bold">Ready to train smarter?</h2>
          <p className="mt-2 text-primary-foreground/85">Connect your wearables and get your first adaptive plan in minutes.</p>
          <Button asChild size="lg" variant="secondary" className="mt-6 gap-2">
            <Link to={cta.label === "Go to dashboard" ? "/app" : "/register"}>{cta.label}<ArrowRight className="w-4 h-4" /></Link>
          </Button>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}