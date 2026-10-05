import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Check, Sparkles, ArrowLeft, Ticket } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import { PLAN_DETAILS, PLAN_TIERS } from "@/lib/subscriptionFeatures";

export default function Subscribe() {
  const { user } = useAuth();
  const { plan: currentPlan, isPro, refresh } = useSubscription();
  const { toast } = useToast();
  const [busy, setBusy] = useState(null);
  const [params] = useSearchParams();
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  React.useEffect(() => {
    const status = params.get("status");
    if (status === "success") toast({ title: "Subscription active 🎉", description: "Your plan is unlocked." });
    if (status === "canceled") toast({ title: "Checkout canceled", variant: "destructive" });
  }, [params]);

  const subscribe = async (tier) => {
    // Stripe Checkout must open as a top-level page. When framed (builder
    // preview), open a new tab synchronously before awaiting the session so
    // popup blockers keep the user activation; when top-level, navigate the
    // current page. Never disable checkout based on iframe/publish state.
    const isFramed = window.self !== window.top;
    const checkoutTab = isFramed ? window.open("", "_blank") : null;
    if (isFramed && !checkoutTab) {
      toast({ title: "Allow popups to continue to checkout.", variant: "destructive" });
      return;
    }
    if (checkoutTab) checkoutTab.opener = null;
    setBusy(tier);
    try {
      base44.analytics.track({ eventName: "checkout_started", properties: { plan: tier } });
      const res = await base44.functions.invoke("stripeCheckout", { plan: tier, user_id: user?.id });
      const url = res?.data?.url;
      if (!url) throw new Error("No checkout URL returned");
      if (checkoutTab) checkoutTab.location.replace(url);
      else window.location.assign(url);
    } catch (e) {
      checkoutTab?.close();
      toast({ title: "Checkout failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const redeem = async () => {
    if (!code.trim()) return;
    setRedeeming(true);
    try {
      const res = await base44.functions.invoke("redeemAccessCode", { action: "redeem", code: code.trim() });
      const ok = res?.data?.success || res?.success;
      if (ok) {
        const plan = res?.data?.plan || res?.plan;
        const exp = res?.data?.expires_at || res?.expires_at;
        toast({ title: "Access unlocked 🎉", description: `You're on ${PLAN_DETAILS[plan]?.label || "Pro"}${exp ? ` until ${new Date(exp).toLocaleDateString()}` : ""}.` });
        setCode("");
        await refresh();
      } else {
        toast({ title: res?.data?.error || res?.error || "Could not redeem code", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: e?.message || "Could not redeem code", variant: "destructive" });
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <PageShell title="Plans & billing" description="Upgrade to unlock unlimited sync, adaptive re-planning, and structured workout export.">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <Badge variant={isPro ? "default" : "outline"}>Current plan: {PLAN_DETAILS[currentPlan]?.label ?? "Free"}</Badge>
        {isPro && <span className="text-xs text-muted-foreground">Manage billing in your Stripe customer portal.</span>}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-start">
        {PLAN_TIERS.map((tier) => {
          const d = PLAN_DETAILS[tier];
          const isCurrent = currentPlan === tier || (tier === "free" && (!currentPlan || currentPlan === "free"));
          return (
            <Card key={tier} className={`relative ${d.highlighted ? "border-primary shadow-md" : ""}`}>
              {d.highlighted && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full">Most popular</span>}
              {d.comingSoon && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-muted text-muted-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full border border-border">Coming Soon</span>}
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
                ) : d.comingSoon ? (
                  <Button variant="outline" className="w-full" disabled>Coming Soon</Button>
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

      <Card className="mt-6 border-dashed">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Ticket className="w-4 h-4 text-primary" />
            <h3 className="font-heading font-semibold text-sm">Have an access code?</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">Beta testers and coaches can redeem a code for instant access — no checkout required.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="TPL-XXXX-XXXX-XXXX"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="sm:max-w-xs"
              onKeyDown={(e) => e.key === "Enter" && redeem()}
            />
            <Button onClick={redeem} disabled={redeeming || !code.trim()}>
              {redeeming ? "Redeeming…" : "Redeem code"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        <Button asChild variant="ghost" size="sm"><Link to="/app"><ArrowLeft className="w-4 h-4" />Back to dashboard</Link></Button>
      </div>
    </PageShell>
  );
}