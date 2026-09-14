import React from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { GatedFeature } from "@/lib/subscriptionFeatures";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

interface TierGateProps {
  feature: GatedFeature;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  title?: string;
  description?: string;
}

export function TierGate({ feature, children, fallback, title = "Pro Tier Feature", description = "Upgrade your plan to unlock advanced analytics, AI replanning tools, and extended telemetry history." }: TierGateProps) {
  const { hasFeature, loading } = useSubscription();

  if (loading) return null;
  if (hasFeature(feature)) return <>{children}</>;

  return fallback || (
    <div className="p-6 border border-border/60 rounded-xl bg-card/40 backdrop-blur-sm flex flex-col items-center justify-center text-center gap-3 my-4">
      <div className="p-3 rounded-full bg-primary/10 text-primary">
        <Sparkles className="w-6 h-6" />
      </div>
      <div>
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-sm mt-1">
          {description}
        </p>
      </div>
      <Button asChild size="sm" className="mt-2">
        <Link to="/settings/billing">Upgrade to Pro</Link>
      </Button>
    </div>
  );
}
