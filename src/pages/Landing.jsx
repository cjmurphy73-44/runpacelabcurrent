import React from "react";
import { Link, Navigate } from "react-router-dom";
import { Activity, ArrowRight, CalendarDays, Check, HeartPulse, ShieldCheck, Watch } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PLAN_TIERS, PLAN_DETAILS } from "@/lib/subscriptionFeatures";
import ProductPreview from "@/components/landing/ProductPreview";
import PublicFooter from "@/components/layout/PublicFooter";
import ThemeToggle from "@/components/layout/ThemeToggle";

const WORKFLOW = [
  {
    icon: Watch,
    title: "Bring in your workouts",
    copy: "Upload FIT, TCX or CSV files, enter a workout manually, or sync with a supported wearable after connecting it.",
  },
  {
    icon: HeartPulse,
    title: "Understand your training",
    copy: "Review session load, fitness trends and available recovery signals. Workout analysis shows whether load came from a recording or a summary.",
  },
  {
    icon: CalendarDays,
    title: "Plan what comes next",
    copy: "Review your scheduled sessions and track them alongside completed workouts. Request a coach insight when you want more context.",
  },
];

const FAQ = [
  {
    question: "Can I start without a wearable?",
    answer: "Yes. Upload a supported workout file or log a session manually. The dashboard can use the data you have, and additional measurements can improve the analysis.",
  },
  {
    question: "Which devices can I connect?",
    answer: "COROS has a direct connection flow. Garmin and other connections depend on provider setup and availability. You can check connection status in Settings.",
  },
  {
    question: "How does TrainPaceLab calculate load?",
    answer: "Workout load can come from heart-rate measurements, a workout summary or a sport-specific estimate. Training history feeds longer-term fitness and fatigue trends.",
  },
];

export default function Landing() {
  const { user, isAuthenticated, authChecked, isLoadingAuth } = useAuth();

  if (!authChecked || isLoadingAuth) {
    return <div role="status" className="flex min-h-screen items-center justify-center text-muted-foreground">Checking your session…</div>;
  }
  if (isAuthenticated && user) return <Navigate to="/app" replace />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a href="#main-content" className="sr-only z-50 focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:rounded-md focus:bg-card focus:p-3">Skip to content</a>
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 pt-safe">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-y-1 px-4 py-2 sm:px-6">
          <Link to="/" className="inline-flex min-h-11 items-center gap-1.5 font-heading font-bold sm:gap-2 sm:text-lg">
            <Activity className="h-5 w-5 text-primary" aria-hidden="true" />
            TrainPaceLab
          </Link>
          <nav aria-label="Main navigation" className="flex items-center gap-1 sm:gap-2">
            <a href="#how-it-works" className="hidden min-h-11 items-center px-2 text-sm text-muted-foreground hover:text-foreground md:inline-flex">How it works</a>
            <a href="#pricing" className="hidden min-h-11 items-center px-2 text-sm text-muted-foreground hover:text-foreground md:inline-flex">Pricing</a>
            <ThemeToggle className="min-h-11 min-w-10" />
            <Button asChild variant="ghost" size="sm" className="min-h-11 px-2 font-semibold text-foreground hover:text-foreground sm:px-3"><Link to="/login">Sign in</Link></Button>
            <Button asChild size="sm" className="min-h-11 px-2 sm:px-4"><Link to="/register">Get started free</Link></Button>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <section className="relative overflow-hidden border-b border-border bg-secondary/30">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid-dots opacity-20" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 sm:gap-12 sm:px-6 sm:py-20 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="max-w-xl">
              <p className="mb-4 text-sm font-semibold text-primary">Training and recovery for endurance athletes</p>
              <h1 className="font-heading text-[2.55rem] font-bold leading-[1.05] tracking-tight sm:text-6xl">
                Understand your training. <span className="text-primary">Own your progress.</span>
              </h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
                Bring workouts and recovery together, see what’s driving your fitness, and follow a plan you can adjust as you train.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="min-h-11 gap-2">
                  <Link to="/register">Get started free <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                </Button>
                <a href="#how-it-works" className="inline-flex min-h-11 items-center rounded-md px-2 text-sm font-semibold underline-offset-4 hover:underline">See how it works</a>
              </div>
            </div>
            <ProductPreview />
          </div>
        </section>

        <section id="how-it-works" aria-labelledby="workflow-title" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-14 sm:px-6 sm:py-20">
          <h2 id="workflow-title" className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">From workout to training plan</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {WORKFLOW.map(({ icon: Icon, title, copy }) => (
              <Card key={title} className="rounded-xl">
                <CardContent className="h-full p-5 sm:p-6">
                  <Icon className="mb-4 h-6 w-6 text-primary" aria-hidden="true" />
                  <h3 className="font-heading text-xl font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Button asChild variant="outline" className="mt-6 min-h-11 whitespace-normal">
            <Link to="/register?returnTo=%2Fimport">Import your first workout <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </Button>
        </section>

        <section id="pricing" aria-labelledby="pricing-title" className="scroll-mt-24 border-y border-border bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <h2 id="pricing-title" className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">Pricing</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PLAN_TIERS.map((tier) => {
                const plan = PLAN_DETAILS[tier];
                return (
                  <Card key={tier} className={plan.highlighted ? "border-primary" : ""}>
                    <CardContent className="flex h-full flex-col p-5">
                      <h3 className="font-heading text-lg font-semibold">{plan.label}</h3>
                      <p className="text-sm text-muted-foreground">{plan.tagline}</p>
                      <p className="mt-4"><strong className="font-heading text-3xl">{plan.price}</strong> <span className="text-sm text-muted-foreground">/ {plan.cadence}</span></p>
                      <ul className="my-5 flex-1 space-y-2">
                        {plan.features.map(feature => (
                          <li key={feature} className="flex gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{feature}</li>
                        ))}
                      </ul>
                      <Button asChild variant={plan.highlighted ? "default" : "outline"} className="min-h-11 w-full">
                        <Link to={tier === "free" ? "/register" : "/register?returnTo=%2Fsubscribe"}>Start with {plan.label}</Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section aria-labelledby="faq-title" className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 sm:py-20 md:grid-cols-[0.75fr_1.25fr]">
          <div>
            <h2 id="faq-title" className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">Questions</h2>
            <Link to="/privacy" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary hover:underline">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" /> How we use your data
            </Link>
          </div>
          <div className="divide-y divide-border border-y border-border">
            {FAQ.map(({ question, answer }) => (
              <details key={question} className="py-1">
                <summary className="cursor-pointer rounded-sm py-3 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">{question}</summary>
                <p className="pb-4 text-sm leading-relaxed text-muted-foreground">{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
