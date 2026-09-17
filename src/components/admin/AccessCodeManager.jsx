import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Copy, RefreshCw, Ticket } from "lucide-react";
import { PLAN_DETAILS } from "@/lib/subscriptionFeatures";

const GRANTABLE = ["pro", "unlimited", "coach_pro"];

function defaultExpiry() {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return d.toISOString().slice(0, 10);
}

export default function AccessCodeManager({ className = "" }) {
  const { toast } = useToast();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ granted_plan: "unlimited", max_uses: 1, expires_at: defaultExpiry(), notes: "" });

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("redeemAccessCode", { action: "list" });
      setCodes(res?.data?.codes || res?.codes || []);
    } catch (e) {
      toast({ title: e?.message || "Could not load codes", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const generate = async () => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke("redeemAccessCode", { action: "generate", ...form });
      if (res?.data?.success || res?.success) {
        toast({ title: "Code created", description: res?.data?.code || res?.code });
        await load();
      } else {
        toast({ title: res?.data?.error || res?.error || "Could not create code", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: e?.message || "Could not create code", variant: "destructive" });
    }
    setBusy(false);
  };

  const copy = (c) => {
    navigator.clipboard?.writeText(c);
    toast({ title: "Copied", description: c });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Ticket className="w-4 h-4" /> Access codes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Generate codes to grant testers full access without Stripe checkout.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Granted plan</Label>
            <select
              className="mt-1 w-full h-9 rounded-md border border-input bg-transparent px-2 text-sm"
              value={form.granted_plan}
              onChange={(e) => setForm({ ...form, granted_plan: e.target.value })}
            >
              {GRANTABLE.map((p) => <option key={p} value={p}>{PLAN_DETAILS[p]?.label || p}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Max uses</Label>
            <Input type="number" min={1} value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs">Expires</Label>
            <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
          </div>
          <div className="flex items-end">
            <Button onClick={generate} disabled={busy} className="w-full">
              {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              {busy ? "Creating…" : "Generate"}
            </Button>
          </div>
        </div>
        <Input placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

        <div className="flex items-center justify-between pt-2">
          <span className="text-sm font-medium">Active codes</span>
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="w-3.5 h-3.5 mr-1" />Refresh</Button>
        </div>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : codes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No codes yet.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-auto">
            {codes.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 border border-border rounded-md px-3 py-2">
                <div className="min-w-0">
                  <code className="text-sm font-mono">{c.code}</code>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="capitalize">{PLAN_DETAILS[c.granted_plan]?.label || c.granted_plan}</Badge>
                    <span className="text-xs text-muted-foreground">{c.used_count}/{c.max_uses} used</span>
                    {c.expires_at && <span className="text-xs text-muted-foreground">exp {new Date(c.expires_at).toLocaleDateString()}</span>}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => copy(c.code)}><Copy className="w-3.5 h-3.5" /></Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}