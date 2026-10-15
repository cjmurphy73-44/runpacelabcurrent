import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageShell from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import {
  Users,
  Activity,
  CalendarRange,
  HeartPulse,
  DollarSign,
  CreditCard,
  AlertCircle,
  RefreshCw,
  ShieldAlert,
  Wifi,
  MessageSquare,
  KeyRound,
  CheckCircle2,
  Loader2,
} from "lucide-react";

function ChecklistGroup({ title, items }) {
  return (
    <div>
      <h3 className="text-sm font-heading font-semibold mb-2">{title}</h3>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.label} className="flex items-start gap-2 text-sm">
            {item.done ? (
              <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-muted-foreground mt-0.5 shrink-0" />
            )}
            <span className={item.done ? "" : "text-muted-foreground"}>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, sub }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <p className="mt-2 text-2xl font-bold font-heading font-mono">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function DistributionCard({ title, icon: Icon, distribution, variant }) {
  const entries = Object.entries(distribution).filter(([, v]) => v > 0);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="w-4 h-4" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {!entries.length && (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        )}
        {entries.map(([key, count]) => (
          <div key={key} className="flex items-center justify-between">
            <Badge
              variant={variant === "status" && key === "active" ? "default" : "outline"}
              className="capitalize"
            >
              {key}
            </Badge>
            <span className="text-sm font-medium font-mono">
              {count}
              {total > 0 && (
                <span className="text-muted-foreground ml-1">
                  ({Math.round((count / total) * 100)}%)
                </span>
              )}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ConnectionHealthCard({ connections }) {
  const rows = [
    { label: "Garmin", ...connections.garmin },
    { label: "Strava", ...connections.strava },
    { label: "COROS", ...connections.coros },
    { label: "Wearable", ...connections.wearable },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Wifi className="w-4 h-4" /> Wearable connection health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-center justify-between border-b border-border pb-2"
          >
            <span className="font-medium">{r.label}</span>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground font-mono">
                {r.total ?? 0} total
              </span>
              {r.issues > 0 ? (
                <Badge variant="destructive">{r.issues} issue{r.issues === 1 ? "" : "s"}</Badge>
              ) : r.total > 0 ? (
                <Badge variant="default">healthy</Badge>
              ) : (
                <Badge variant="outline">none</Badge>
              )}
            </div>
          </div>
        ))}
        {connections.wearable?.byProvider &&
          Object.keys(connections.wearable.byProvider).length > 0 && (
            <p className="text-xs text-muted-foreground pt-1">
              Wearable providers:{" "}
              {Object.entries(connections.wearable.byProvider)
                .map(([p, c]) => `${p} (${c})`)
                .join(", ")}
            </p>
          )}
      </CardContent>
    </Card>
  );
}

function RecoveryCoverageCard({ coverage }) {
  const pct = (n, total) =>
    total > 0 ? `${Math.round((n / total) * 100)}%` : "—";
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <HeartPulse className="w-4 h-4" /> Recovery data coverage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground mb-2">
          {coverage.total} daily-metric records total
        </p>
        {[
          { label: "Sleep score", count: coverage.sleep },
          { label: "HRV", count: coverage.hrv },
          { label: "Resting HR", count: coverage.restingHr },
        ].map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-mono">
              {row.count}{" "}
              <span className="text-muted-foreground">
                ({pct(row.count, coverage.total)})
              </span>
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function Operations() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("ownerDashboard", {});
      setData(res.data || res);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Could not load dashboard.");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <PageShell title="Operations">
        <Card>
          <CardContent className="p-10 text-center">
            <ShieldAlert className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="mt-3 font-medium">Access restricted</p>
            <p className="text-sm text-muted-foreground">
              This dashboard is for workspace admins only.
            </p>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell title="Operations">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={load}
                >
                  Try again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const ops = data?.operations;
  const biz = data?.business;

  return (
    <PageShell
      title="Operations dashboard"
      description="Aggregate operational health and business activity — owner view only."
      actions={
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          Refresh
        </Button>
      }
    >
      {/* Operations overview — stat tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatTile
          icon={Users}
          label="Athlete profiles"
          value={ops?.totalAthletes ?? "—"}
        />
        <StatTile
          icon={Activity}
          label="Workouts logged"
          value={ops?.totalWorkouts ?? "—"}
          sub={`${ops?.recentWorkouts ?? 0} in the last 7 days`}
        />
        <StatTile
          icon={CalendarRange}
          label="Active training plans"
          value={ops?.activePlans ?? "—"}
        />
        <StatTile
          icon={MessageSquare}
          label="Unresolved feedback"
          value={ops?.unresolvedFeedback ?? "—"}
        />
      </div>

      {/* Operations detail cards */}
      <div className="grid gap-4 lg:grid-cols-2 mb-6">
        <ConnectionHealthCard connections={ops?.connections || {}} />
        <RecoveryCoverageCard coverage={ops?.recoveryCoverage || {}} />
        <DistributionCard
          title="Plan session outcomes"
          icon={CheckCircle2}
          distribution={ops?.sessionStatusDistribution || {}}
          variant="status"
        />
      </div>

      {/* Business — stat tiles */}
      <h2 className="font-heading font-bold text-lg mb-3">Business & subscriptions</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatTile
          icon={DollarSign}
          label="Monthly recurring revenue"
          value={`$${biz?.mrr ?? 0}`}
        />
        <StatTile
          icon={CreditCard}
          label="Total subscriptions"
          value={biz?.totalSubs ?? "—"}
        />
        <StatTile
          icon={KeyRound}
          label="Access codes issued"
          value={biz?.accessCodes?.total ?? "—"}
          sub={`${biz?.accessCodes?.used ?? 0} redeemed`}
        />
      </div>

      {/* Business detail cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DistributionCard
          title="Plan distribution"
          icon={CreditCard}
          distribution={biz?.planDistribution || {}}
        />
        <DistributionCard
          title="Subscription status"
          icon={Activity}
          distribution={biz?.subStatusDistribution || {}}
          variant="status"
        />
      </div>

      {/* Launch checklist — external and operational tasks that cannot be
          verified from inside the app. Keeps the operator honest about what
          still needs manual sign-off before going fully live. */}
      <h2 className="font-heading font-bold text-lg mb-3 mt-8">Launch checklist</h2>
      <Card>
        <CardContent className="p-5 space-y-4">
          <ChecklistGroup
            title="Payments & billing"
            items={[
              { label: "Checkout binds to the authenticated user (client_reference_id + metadata)", done: true },
              { label: "Webhook has event-id idempotency and validates user exists", done: true },
              { label: "Billing portal resolves customer from subscription record", done: true },
              { label: "Verify a live test purchase end-to-end in Stripe Dashboard", done: false },
              { label: "Confirm webhook endpoint is registered for live mode in Stripe", done: true },
            ]}
          />
          <ChecklistGroup
            title="Data & privacy"
            items={[
              { label: "Account deletion covers all owned entities + connections", done: true },
              { label: "Athlete data reset covers lab results and connections", done: true },
              { label: "RLS enforced on all athlete-scoped entities", done: true },
              { label: "Review privacy policy and refund policy with legal counsel", done: false },
            ]}
          />
          <ChecklistGroup
            title="Integrations"
            items={[
              { label: "Manual workout entry and file import work without a wearable", done: true },
              { label: "Connection status and last-sync shown per provider", done: true },
              { label: "Resolve COROS OAuth callback (state mismatch / dispatcher secret)", done: true },
              { label: "Test each wearable OAuth flow with a real account", done: false },
            ]}
          />
          <ChecklistGroup
            title="Operations"
            items={[
              { label: "Operations dashboard shows aggregate MRR, athletes, connections", done: true },
              { label: "Support page routes billing/account issues with self-serve links", done: true },
              { label: "Define support response SLA and refund handling process", done: false },
              { label: "Set up error monitoring and alerting (logErrorToAirtable)", done: true },
            ]}
          />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mt-6">
        All figures are aggregate counts — no individual athlete records or health
        details are exposed on this dashboard.
      </p>
    </PageShell>
  );
}