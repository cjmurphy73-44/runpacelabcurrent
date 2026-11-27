import React from "react";
import { Link, Navigate } from "react-router-dom";
import { Activity, ArrowRight, CalendarDays, HeartPulse, Upload } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import ProductPreview from "@/components/landing/ProductPreview";
import PublicFooter from "@/components/layout/PublicFooter";
import ThemeToggle from "@/components/layout/ThemeToggle";

const WORKFLOW = [
  {
    icon: Upload,
    title: "Bring in your workouts",
    detail: "Upload FIT, TCX or CSV, log a session, or connect a supported wearable.",
  },
  {
    icon: HeartPulse,
    title: "See how you’re adapting",
    detail: "Follow session load, fitness trends and recovery signals from the data you have.",
  },
  {
    icon: CalendarDays,
    title: "Follow your training plan",
    detail: "See what’s scheduled and review completed workouts alongside your plan.",
  },
];

export default function Landing() {
  const { user, isAuthenticated, authChecked, isLoadingAuth } = useAuth();

  if (!authChecked || isLoadingAuth) {
    return <div role="status" className="flex min-h-dvh items-center justify-center text-muted-foreground">Checking your session…</div>;
  }
  if (isAuthenticated && user) return <Navigate to="/app" replace />;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a href="#main-content" className="sr-only z-50 focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:rounded-md focus:bg-card focus:p-3">Skip to content</a>
      <header className="border-b border-border pt-safe">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-5 py-2 sm:px-8">
          <Link to="/" className="inline-flex min-h-11 items-center gap-2 font-heading font-bold tracking-tight sm:text-lg">
            <Activity className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            TrainPaceLab
          </Link>
          <nav aria-label="Main navigation" className="flex items-center gap-1 sm:gap-4">
            <a href="#how-it-works" className="hidden min-h-11 items-center px-2 text-sm text-muted-foreground hover:text-foreground sm:inline-flex">How it works</a>
            <a href="#pricing" className="hidden min-h-11 items-center px-2 text-sm text-muted-foreground hover:text-foreground sm:inline-flex">Pricing</a>
            <ThemeToggle className="min-h-11 min-w-11" />
            <Button asChild variant="ghost" className="min-h-11 px-2 font-semibold sm:px-3"><Link to="/login">Sign in</Link></Button>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <section aria-labelledby="landing-title" className="relative isolate overflow-hidden bg-[#0a121e] text-white">
          <picture aria-hidden="true" className="absolute inset-x-0 top-0 -z-20 block h-[17rem] md:h-[21rem] lg:inset-y-0 lg:left-[18%] lg:h-full">
            <source media="(max-width: 767px)" srcSet="/assets/landing-runner-mobile.webp" />
            <img
              src="/assets/landing-runner.webp"
              alt=""
              width="1536"
              height="1024"
              fetchPriority="high"
              className="h-full w-full object-cover object-[65%_35%] lg:object-[center_12%]"
            />
          </picture>
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,transparent_6rem,rgba(10,18,30,0.22)_10rem,#0a121e_17rem)] md:bg-[linear-gradient(180deg,transparent_8rem,rgba(10,18,30,0.25)_13rem,#0a121e_21rem)] lg:bg-[linear-gradient(90deg,#0a121e_14%,rgba(10,18,30,0.96)_26%,rgba(10,18,30,0.72)_43%,rgba(10,18,30,0.14)_68%,transparent_100%)]" />
          <div className="mx-auto flex max-w-6xl items-center px-5 pb-10 pt-[13rem] sm:px-8 sm:pb-12 md:pt-[16rem] lg:min-h-[34rem] lg:py-20">
            <div className="max-w-xl">
              <h1 id="landing-title" className="max-w-[13ch] font-heading text-[clamp(2.5rem,5.9vw,4.85rem)] font-bold leading-[1.03] tracking-[-0.055em]">
                Know what to <span className="text-blue-200">train next.</span>
              </h1>
              <p className="mt-4 max-w-md text-base leading-relaxed text-slate-200 sm:text-lg">
                Bring workouts, recovery and training plans together. See how your fitness is changing and what’s on your schedule.
              </p>
              <Button asChild className="mt-6 min-h-12 bg-blue-100 px-5 font-bold text-slate-950 shadow-none hover:bg-white focus-visible:ring-blue-200">
                <Link to="/register">Get started free <ArrowRight aria-hidden="true" /></Link>
              </Button>
            </div>
          </div>
        </section>

        <section id="how-it-works" aria-labelledby="workflow-title" className="mx-auto grid max-w-6xl items-center gap-7 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
          <div>
            <h2 id="workflow-title" className="max-w-[21ch] font-heading text-3xl font-bold tracking-tight sm:text-4xl">From workout to training plan</h2>
            <ul className="mt-4 divide-y divide-border">
              {WORKFLOW.map(({ icon: Icon, title, detail }) => (
                <li key={title} className="flex items-start gap-3 py-3">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{detail}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Link to="/register?returnTo=%2Fimport" className="inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-semibold underline-offset-4 hover:underline">
              Import your first workout <ArrowRight className="h-4 w-4 text-primary" aria-hidden="true" />
            </Link>
          </div>
          <ProductPreview />
        </section>

        <section aria-labelledby="understand-title" className="border-t border-border bg-card/50">
          <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-20">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Go beyond the workout summary</p>
              <h2 id="understand-title" className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">Understand what your training is telling you.</h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Training data is most useful when you can see where it came from, how it was calculated, and what it means for your next decision.
                TrainPaceLab brings the important context together without hiding uncertainty.
              </p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <article className="rounded-xl border border-border bg-background p-5">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">01 / Evidence</span>
                <h3 className="mt-3 font-heading text-lg font-semibold">What was actually recorded?</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Explore saved workouts and available sensor data. See when a training-load estimate comes from a verified stream or a summary.
                </p>
              </article>
              <article className="rounded-xl border border-border bg-background p-5">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">02 / Response</span>
                <h3 className="mt-3 font-heading text-lg font-semibold">How is training accumulating?</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Follow fitness and fatigue trends in context. Recovery information can add insight when measurements are available.
                </p>
              </article>
              <article className="rounded-xl border border-border bg-background p-5">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">03 / Action</span>
                <h3 className="mt-3 font-heading text-lg font-semibold">What comes next?</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Bring your active plan, recent sessions and on-demand coaching together so decisions follow your actual training.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section aria-labelledby="sports-title" className="border-t border-border">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:px-8 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <h2 id="sports-title" className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">Built for endurance, not just one sport.</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Run, ride, swim or combine disciplines. Keep activity history and training decisions in one place rather than stitching together multiple dashboards.
              </p>
              <Link to="/register?returnTo=%2Fimport" className="mt-5 inline-flex min-h-11 items-center gap-2 font-semibold text-primary underline-offset-4 hover:underline">
                Start with a workout file <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Running', 'Pace, heart rate and progression'],
                ['Cycling', 'Power where measured'],
                ['Swimming', 'Sessions and training history'],
                ['Triathlon', 'One view across disciplines'],
              ].map(([sport, description]) => (
                <div key={sport} className="rounded-xl border border-border bg-secondary/30 p-4 sm:p-5">
                  <p className="font-heading text-lg font-semibold">{sport}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="trust-title" className="border-t border-border bg-secondary/20">
          <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
            <h2 id="trust-title" className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Clear about what the data can and cannot say.</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-semibold">Your numbers should have an explanation.</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Workout load, training trends and recovery signals have different levels of evidence. We distinguish measured information from estimates rather than presenting every number as equally certain.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-semibold">You remain in control of your training.</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Training plans and coaching support informed choices. If recovery data is missing, we explain what is unavailable instead of manufacturing a confident readiness rating.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="questions-title" className="border-t border-border">
          <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
            <h2 id="questions-title" className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Questions before you begin</h2>
            <div className="mt-5 divide-y divide-border rounded-xl border border-border px-4 sm:px-6">
              {[
                ['Do I need a connected watch?', 'No. Start with a FIT, TCX or CSV workout, or log a session manually. Wearable availability depends on the provider connection being supported and configured.'],
                ['Will every activity have full sensor analysis?', 'Not necessarily. Some imports provide full recordings and others only summaries. We show what is available and avoid presenting missing samples as measured data.'],
                ['Can I use TrainPaceLab for more than running?', 'Yes. Training history and plans can cover running, cycling, swimming and triathlon, with sport-specific detail when suitable measurements are available.'],
                ['Can I start for free?', 'Yes. Begin with a free account and your training history. Paid capabilities are available only when checkout and entitlements have been enabled and verified.'],
              ].map(([question, answer]) => (
                <details key={question} className="group py-4">
                  <summary className="cursor-pointer list-item min-h-8 font-semibold">{question}</summary>
                  <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" aria-labelledby="pricing-title" className="border-t border-border bg-secondary/30">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-4 px-5 py-7 sm:px-8">
            <div>
              <h2 id="pricing-title" className="font-heading text-xl font-semibold tracking-tight">Start free</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Import workouts and build your training history without a subscription.</p>
            </div>
            <Button asChild variant="outline" className="min-h-11 shadow-none"><Link to="/register">Create an account</Link></Button>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
