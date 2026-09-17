import React from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { hasFeature, PLAN_DETAILS } from "@/lib/subscriptionFeatures";

const LABELS = {
  unlimited_sync: "Unlimited wearable sync is a Pro feature",
  adaptive_replan: "Adaptive re-planning is a Pro feature",
  structured_export: "Structured workout export is a Pro feature",
  coach_workspace: "The Coach Workspace is a Coach Pro feature",
};

export default function FeatureGate({ feature, plan, children, compact = false }) {
  if (hasFeature(plan, feature)) return <>{children}</>;

  if (compact) {
    return (
      <Button asChild variant="outline" size="sm" className="gap-1.5">
        <Link to="/subscribe"><Lock className="w-3.5 h-3.5" />{LABELS[feature]}</Link>
      </Button>
    );
  }

  const target = feature === "coach_workspace" ? PLAN_DETAILS.coach_pro : PLAN_DETAILS.pro;
  const cta = feature === "coach_workspace" ? "Upgrade to Coach Pro" : "Upgrade to Pro";
  return (
    <Card className="border-dashed">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0"><Lock className="w-4 h-4" /></div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{LABELS[feature]}</p>
            <p className="text-xs text-muted-foreground">{target.tagline} · {target.price}/{target.cadence}</p>
          </div>
        </div>
        <Button asChild size="sm"><Link to="/subscribe">{cta}</Link></Button>
      </CardContent>
    </Card>
  );
}