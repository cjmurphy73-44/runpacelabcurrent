import React, { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, ArrowRight, Activity, CalendarClock, Watch } from "lucide-react";
import { PLAN_DETAILS } from "@/lib/subscriptionFeatures";
import { useSubscription } from "@/hooks/useSubscription";
import PublicFooter from "@/components/layout/PublicFooter";
import ThemeToggle from "@/components/layout/ThemeToggle";

// Public post-checkout welcome page. Lives OUTSIDE the auth gate so a returning
// payer always sees a thank-you + explanation of what they unlocked, even if
// their session dropped during the Stripe redirect (which previously dumped
// them back onto the login wall with only a toast).
const NEXT_STEPS = [
  { icon: Watch, title: "Connect your wearables", body: "Sync COROS, or upload FIT/TCX/CSV from any watch. Paid plans unlock unlimited sync history." },
  { icon: CalendarClock, title: "Open your adaptive plan", body: "Your plan now reshapes around your real recovery. Review today's session on the dashboard." },
  { icon: Activity, title: "Explore the Physiology Lab", body: "CTL/ATL/TSB, ODE fitness modelling, and race prediction are now fully unlocked." },
];

export default function CheckoutSuccess() {
  const [params] = useSearchParams();
  const planKey = params.get("plan");
  const plan = (planKey && PLAN_DETAILS[planKey]) ? planKey : "pro";
  const d = PLAN_DETAILS[plan];
  const { refresh } = useSubscription();

  // If the payer is still authenticated, refresh entitlement state so the rest
  // of the app reflects the new plan the moment they click into the dashboard.
  useEffect(() => { refresh().catch(() => {}); }, [refresh]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur pt-safe">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-heading font-bold text-lg">
            <Activity className="w-5 h-5 text-primary" />
            <span>TrainPaceLab</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-dots opacity-20 pointer-events-none" />
          <div className="max-w-3xl mx-auto px-4 py-16 sm:py-20 relative text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-3 py-1 text-xs font-medium text-success">
              <Check className="w-3.5 h-3.5" /> Payment confirmed
            </span>
            <h1 className="mt-6 font-heading text-4xl sm:text-5xl font-bold tracking-tight leading-[1.05]">
              Welcome to {d.label}. Thank you.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto">
              Your subscription is active. Here's everything you just unlocked.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link to="/app">Go to dashboard<ArrowRight className="w-4 h-4" /></Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/import">Connect a wearable</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-4 pb-12">
          <Card className="border-primary/40 shadow-md shadow-primary/10">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-5">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="font-heading text-xl font-semibold">What you're paying for</h2>
                <Badge variant="default" className="ml-auto">{d.label} · {d.price}/{d.cadence}</Badge>
              </div>
              <ul className="grid sm:grid-cols-2 gap-3">
                {d.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center bg-primary/15">
                      <Check className="w-3.5 h-3.5 text-primary" />
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        <section className="border-t border-border bg-muted/40">
          <div className="max-w-3xl mx-auto px-4 py-14">
            <h2 className="font-heading text-2xl font-bold mb-8 text-center">Where to start</h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {NEXT_STEPS.map((s) => (
                <div key={s.title} className="space-y-3">
                  <div className="w-11 h-11 rounded-md flex items-center justify-center bg-primary/10 text-primary">
                    <s.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-heading font-semibold text-base">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-primary">
          <div className="max-w-3xl mx-auto px-4 py-12 text-center text-primary-foreground">
            <h2 className="font-heading text-2xl font-bold">Ready to train smarter?</h2>
            <p className="mt-2 text-primary-foreground/85">Your plan is unlocked. Let's get to work.</p>
            <Button asChild size="lg" variant="secondary" className="mt-6 gap-2">
              <Link to="/app">Open my dashboard<ArrowRight className="w-4 h-4" /></Link>
            </Button>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}