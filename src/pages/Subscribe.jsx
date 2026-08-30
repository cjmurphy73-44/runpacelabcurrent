import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, ArrowLeft } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import { PLAN_DETAILS, PLAN_TIERS } from "@/lib/subscriptionFeatures";

export default function Subscribe() {
  const { user } = useAuth();
  const { plan: currentPlan, isPro } = useSubscription();
  const { toast } = useToast();
  const [busy, setBusy] = useState(null);
  const [params] = useSearchParams();

  React.useEffect(() => {
    const status = params.get("status");
    if (status === "success") toast({ title: "Subscription active 🎉", description: "Your Pro features are unlocked." });
    if (status === "canceled") toast({ title: "Checkout canceled", variant: "destructive" });
  }, [params]);

  const subscribe = async (tier) => {
    if (window.self !== window.top) {
      alert("Checkout only works from the published app — open run-pace-logic.base44.app in a new tab to subscribe.");
      return;
    }
    setBusy(tier);
    try {
      const res = await base44.functions.invoke("stripeCheckout", { plan: tier, user_id: user?.id });
      const url = res?.data?.url;
      if (url) { window.location.href = url; return; }
      toast({ title: "Could not start checkout", variant: "destructive" });
    } catch (e) {
      toast({ title: "Checkout failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <PageShell title="Plans & billing" description="Upgrade to unlock unlimited sync, adaptive re-planning, and structured workout export.">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant={isPro ? "default" : "outline"}>Current plan: {PLAN_DETAILS[currentPlan]?.label ?? "Free"}</Badge>
        {isPro && <span className="text-xs text-muted-foreground">Manage billing in your Stripe customer portal.</span>}
      </div>
      <div className="grid gap-4 md:grid-cols-3 items-start">
        {PLAN_TIERS.map((tier) => {
          const d = PLAN_DETAILS[tier];
          const isCurrent = currentPlan === tier || (tier === "free" && currentPlan === "free");
          return (
            <Card key={tier} className={`relative ${d.highlighted ? "border-primary shadow-md" : ""}`}>
              {d.highlighted && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full">Most popular</span>}
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{d.label}</CardTitle>
                  {tier !== "free" && <Sparkles className="w-4 h-4 text-primary" />}
                </div>
                <CardDescription>{d.tagline}</CardDescription>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-bold font-heading">{d.price}</span>
                  <span className="text-sm text-muted-foreground">/{d.cadence}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-5">
                  {d.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {tier === "free" ? (
                  <Button variant="outline" className="w-full" disabled={isCurrent}>{isCurrent ? "Your current plan" : "Downgrade"}</Button>
                ) : (
                  <Button className="w-full" disabled={isCurrent || busy !== null} onClick={() => subscribe(tier)}>
                    {busy === tier ? "Redirecting…" : isCurrent ? "Current plan" : `Upgrade to ${d.label}`}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="mt-6">
        <Button asChild variant="ghost" size="sm"><Link to="/"><ArrowLeft className="w-4 h-4" />Back to dashboard</Link></Button>
      </div>
    </PageShell>
  );
}