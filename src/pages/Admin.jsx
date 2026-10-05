import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign, Users, Activity as ActivityIcon, TrendingUp, ShieldAlert, Database, RefreshCw } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import AccessCodeManager from "@/components/admin/AccessCodeManager";

const PLAN_PRICE = { free: 0, pro: 9, unlimited: 15, coach_pro: 29, team: 29 };

export default function Admin() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subs, setSubs] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [users, setUsers] = useState([]);
  const [syncConnections, setSyncConnections] = useState([]);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);
  const [syncErr, setSyncErr] = useState(null);
  const [connRefreshing, setConnRefreshing] = useState(false);
  const [feedback, setFeedback] = useState([]);

  const loadData = async () => {
    try {
      const [s, a, u, garmin, strava, coros, wearable, fb] = await Promise.all([
        base44.entities.Subscription.list("-created_date", 500),
        base44.entities.AthleteProfile.list("-created_date", 500),
        base44.entities.User.list("-created_date", 500),
        base44.entities.GarminConnection.list("-created_date", 200).catch(() => []),
        base44.entities.StravaConnection.list("-created_date", 200).catch(() => []),
        base44.entities.CorosConnection.list("-created_date", 200).catch(() => []),
        base44.entities.WearableConnection.list("-created_date", 200).catch(() => []),
        base44.entities.BetaFeedback.list("-created_date", 100).catch(() => []),
      ]);
      setSubs(s); setAthletes(a); setUsers(u);
      setFeedback(fb);
      // Index athletes by id for connection → athlete name lookup.
      const athleteById = {};
      for (const p of a) athleteById[p.id] = p;
      // Flatten all *Connection rows into one sync-health list keyed by provider.
      // Include athlete_id so the admin can see WHOSE connection this is.
      const flat = (rows, provider) => (rows || []).map((r) => ({
        provider: typeof provider === "function" ? provider(r) : provider,
        athlete_id: r.athlete_id,
        athlete_name: r.athlete_id && athleteById[r.athlete_id]
          ? `${athleteById[r.athlete_id].first_name || ""} ${athleteById[r.athlete_id].last_name || ""}`.trim()
          : null,
        status: r.status, last_sync_at: r.last_sync_at, last_error: r.last_error, connected_at: r.connected_at,
      }));
      setSyncConnections([
        ...flat(garmin, "Garmin"),
        ...flat(strava, "Strava"),
        ...flat(coros, "COROS"),
        ...flat(wearable, (r) => (r.provider ? r.provider : "wearable")),
      ]);
    } catch (e) {
      setError(e?.message || "Could not load business data.");
    }
    setLoading(false);
  };

  const refreshConnections = async () => {
    setConnRefreshing(true);
    try {
      const [a, garmin, strava, coros, wearable] = await Promise.all([
        base44.entities.AthleteProfile.list("-created_date", 500),
        base44.entities.GarminConnection.list("-created_date", 200).catch(() => []),
        base44.entities.StravaConnection.list("-created_date", 200).catch(() => []),
        base44.entities.CorosConnection.list("-created_date", 200).catch(() => []),
        base44.entities.WearableConnection.list("-created_date", 200).catch(() => []),
      ]);
      setAthletes(a);
      const athleteById = {};
      for (const p of a) athleteById[p.id] = p;
      const flat = (rows, provider) => (rows || []).map((r) => ({
        provider: typeof provider === "function" ? provider(r) : provider,
        athlete_id: r.athlete_id,
        athlete_name: r.athlete_id && athleteById[r.athlete_id]
          ? `${athleteById[r.athlete_id].first_name || ""} ${athleteById[r.athlete_id].last_name || ""}`.trim()
          : null,
        status: r.status, last_sync_at: r.last_sync_at, last_error: r.last_error, connected_at: r.connected_at,
      }));
      setSyncConnections([
        ...flat(garmin, "Garmin"),
        ...flat(strava, "Strava"),
        ...flat(coros, "COROS"),
        ...flat(wearable, (r) => (r.provider ? r.provider : "wearable")),
      ]);
    } catch {}
    setConnRefreshing(false);
  };

  const updateFeedbackStatus = async (id, status) => {
    try {
      await base44.entities.BetaFeedback.update(id, { status });
      setFeedback((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));
    } catch {}
  };

  const syncAirtable = async () => {
    setSyncing(true); setSyncErr(null); setSyncMsg(null);
    try {
      const res = await base44.functions.invoke("airtableSync", { action: "sync_business_snapshot" });
      const d = res.data || res;
      setSyncMsg(`Pushed snapshot — MRR $${d.snapshot?.mrr_usd ?? 0}, ${d.snapshot?.users ?? 0} users, ${d.snapshot?.athletes ?? 0} athletes. Airtable: ${d.airtable?.system_health?.updated ?? 0} metrics, ${d.airtable?.user_segments?.updated ?? 0} segments updated.`);
    } catch (e) {
      setSyncErr(e?.response?.data?.error || e?.message || "Sync failed.");
    }
    setSyncing(false);
  };

  useEffect(() => { loadData(); }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <PageShell title="Admin">
        <Card>
          <CardContent className="p-10 text-center">
            <ShieldAlert className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="mt-3 font-medium">Access restricted</p>
            <p className="text-sm text-muted-foreground">This area is for workspace admins only.</p>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const activeSubs = subs.filter((s) => s.status === "active" || s.status === "trialing");
  const mrr = activeSubs.reduce((sum, s) => sum + (PLAN_PRICE[s.plan] || 0), 0);
  const planCounts = { free: 0, pro: 0, unlimited: 0, coach_pro: 0, team: 0 };
  subs.forEach((s) => { if (planCounts[s.plan] !== undefined) planCounts[s.plan]++; });

  const stats = [
    { label: "Monthly recurring revenue", value: `A$${mrr}`, icon: DollarSign },
    { label: "Active subscribers", value: activeSubs.length, icon: TrendingUp },
    { label: "Athlete profiles", value: athletes.length, icon: ActivityIcon },
    { label: "Registered users", value: users.length, icon: Users },
  ];

  return (
    <PageShell title="Business dashboard" description="Revenue, subscribers, and adoption at a glance.">
      {error && <p className="text-sm text-destructive mb-4">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{s.label}</span>
                <s.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-2xl font-bold font-heading">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Plan breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(planCounts).map(([plan, count]) => (
              <div key={plan} className="flex items-center justify-between">
                <Badge variant="outline" className="capitalize">{plan}</Badge>
                <span className="text-sm font-medium">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent subscribers</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-auto">
            {subs.slice(0, 12).map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm border-b border-border pb-2">
                <span className="capitalize font-medium">{s.plan}</span>
                <Badge variant={s.status === "active" ? "default" : "outline"}>{s.status}</Badge>
              </div>
            ))}
            {!subs.length && <p className="text-sm text-muted-foreground">No subscriptions yet.</p>}
          </CardContent>
        </Card>
      </div>

      <AccessCodeManager className="mt-4" />

      <Card className="mt-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><ActivityIcon className="w-4 h-4" /> Wearable sync health</CardTitle>
            <Button variant="outline" size="sm" onClick={refreshConnections} disabled={connRefreshing}>
              {connRefreshing ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 max-h-80 overflow-auto">
          {!syncConnections.length && <p className="text-sm text-muted-foreground">No wearable connections yet.</p>}
          {syncConnections.map((c, i) => (
            <div key={i} className="flex items-center justify-between text-sm border-b border-border pb-2 gap-3">
              <div className="flex items-center gap-2 shrink-0 min-w-0">
                <span className="font-medium capitalize">{c.provider}</span>
                {c.athlete_name && <span className="text-xs text-muted-foreground truncate max-w-[120px]">· {c.athlete_name}</span>}
              </div>
              <span className="text-xs text-muted-foreground truncate flex-1 min-w-0 text-right">
                {c.last_sync_at ? `Last sync ${new Date(c.last_sync_at).toLocaleString()}` : "Never synced"}
                {c.last_error ? ` — ${c.last_error}` : ""}
              </span>
              <Badge variant={c.status === "connected" ? "default" : "outline"} className="capitalize shrink-0">{c.status || "—"}</Badge>
            </div>
          ))}
          <p className="text-xs text-muted-foreground pt-1">Shows the most recent 200 connections per provider. If you have more, older entries are not listed here.</p>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ActivityIcon className="w-4 h-4" /> Beta feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-80 overflow-auto">
          {!feedback.length && <p className="text-sm text-muted-foreground">No feedback submitted yet.</p>}
          {feedback.map((f) => (
            <div key={f.id} className="border-b border-border pb-2 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Badge variant={f.feedback_type === "bug" ? "destructive" : "outline"} className="capitalize text-xs">{f.feedback_type}</Badge>
                <select
                  value={f.status || "new"}
                  onChange={(e) => updateFeedbackStatus(f.id, e.target.value)}
                  className="text-xs rounded border border-border bg-transparent px-1.5 py-0.5"
                >
                  <option value="new">New</option>
                  <option value="triaged">Triaged</option>
                  <option value="resolved">Resolved</option>
                  <option value="wont_fix">Won't fix</option>
                </select>
              </div>
              <p className="text-sm">{f.message}</p>
              <p className="text-xs text-muted-foreground">
                {f.contact_email ? `From: ${f.contact_email}` : "Anonymous"} · {f.route || "no route"} · {new Date(f.created_date).toLocaleDateString()}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Database className="w-4 h-4" /> Airtable sync</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Push this snapshot (MRR, plan counts, user/athlete/workout totals) into your Airtable business tracker.
          </p>
          <Button onClick={syncAirtable} disabled={syncing}>
            {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Sync to Airtable
          </Button>
          {syncMsg && <p className="text-sm text-primary">{syncMsg}</p>}
          {syncErr && <p className="text-sm text-destructive">{syncErr}</p>}
        </CardContent>
      </Card>
    </PageShell>
  );
}