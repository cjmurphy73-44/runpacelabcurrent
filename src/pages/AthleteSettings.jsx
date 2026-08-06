import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Save, Trash2, ShieldAlert } from "lucide-react";

// TIER_CONSTANTS mirrors ProfileSetupForm + updateAthleteProfile so editing the tier in Settings
// keeps the CTL/ATL time constants consistent with the chosen philosophy.
const TIER_CONSTANTS = {
  conservative: { ctl: 10, atl: 12 },
  moderate: { ctl: 42, atl: 7 },
  aggressive: { ctl: 20, atl: 5 },
};

const EMPTY_FORM = {
  first_name: "", last_name: "", country: "", sex: "", age: "",
  height_cm: "", weight_kg: "", training_tier_preference: "moderate",
  max_heart_rate: "", resting_hr: "", lactate_threshold_hr: "",
  ftp_watts: "", functional_threshold_pace_ms: "", vdot_estimate: "",
  injury_history: "",
};

export default function AthleteSettings() {
  const [athlete, setAthlete] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.functions.invoke("fetchAthleteProfile", {});
        const a = res.data?.athlete;
        setAthlete(a || null);
        if (a) {
          setForm({
            first_name: a.first_name ?? "",
            last_name: a.last_name ?? "",
            country: a.country ?? "",
            sex: a.sex ?? "",
            age: a.age ?? "",
            height_cm: a.height_cm ?? "",
            weight_kg: a.weight_kg ?? "",
            training_tier_preference: a.training_tier_preference ?? "moderate",
            max_heart_rate: a.max_heart_rate ?? "",
            resting_hr: a.resting_hr ?? "",
            lactate_threshold_hr: a.lactate_threshold_hr ?? "",
            ftp_watts: a.ftp_watts ?? "",
            functional_threshold_pace_ms: a.functional_threshold_pace_ms ?? "",
            vdot_estimate: a.vdot_estimate ?? "",
            injury_history: a.injury_history ?? "",
          });
        }
      } catch (err) {
        setMessage({ type: "error", text: err?.response?.data?.error || "Could not load your profile." });
      }
      setLoading(false);
    })();
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!athlete) return;
    setSaving(true);
    setMessage(null);
    const tier = form.training_tier_preference || "moderate";
    const c = TIER_CONSTANTS[tier];
    const updates = {
      first_name: form.first_name,
      last_name: form.last_name,
      country: form.country || undefined,
      sex: form.sex || undefined,
      age: form.age ? Number(form.age) : undefined,
      height_cm: form.height_cm ? Number(form.height_cm) : undefined,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : undefined,
      training_tier_preference: tier,
      max_heart_rate: form.max_heart_rate ? Number(form.max_heart_rate) : undefined,
      resting_hr: form.resting_hr ? Number(form.resting_hr) : undefined,
      lactate_threshold_hr: form.lactate_threshold_hr ? Number(form.lactate_threshold_hr) : undefined,
      ftp_watts: form.ftp_watts ? Number(form.ftp_watts) : undefined,
      functional_threshold_pace_ms: form.functional_threshold_pace_ms ? Number(form.functional_threshold_pace_ms) : undefined,
      vdot_estimate: form.vdot_estimate ? Number(form.vdot_estimate) : undefined,
      injury_history: form.injury_history || undefined,
      ctl_time_constant_days: c.ctl,
      atl_time_constant_days: c.atl,
    };
    try {
      const res = await base44.functions.invoke("updateAthleteProfile", { athlete_id: athlete.id, updates });
      setAthlete(res.data?.athlete || athlete);
      setMessage({ type: "success", text: "Profile saved." });
    } catch (err) {
      setMessage({ type: "error", text: err?.response?.data?.error || "Could not save your profile." });
    }
    setSaving(false);
  };

  const handleReset = async () => {
    if (!athlete) return;
    const confirmed = window.confirm(
      "This permanently deletes all your workouts, training plans, plan sessions, and telemetry for this profile. This cannot be undone. Continue?"
    );
    if (!confirmed) return;
    setResetting(true);
    setMessage(null);
    try {
      await base44.functions.invoke("resetAthleteData", { athlete_id: athlete.id });
      setMessage({ type: "success", text: "All data reset. Your profile remains — you can re-import workouts anytime." });
    } catch (err) {
      setMessage({ type: "error", text: err?.response?.data?.error || "Could not reset your data." });
    }
    setResetting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading settings...
      </div>
    );
  }

  if (!athlete) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-heading font-bold">Athlete Settings</h1>
        <Alert>
          <ShieldAlert className="w-4 h-4" />
          <AlertTitle>No athlete profile found</AlertTitle>
          <AlertDescription>
            Create your athlete profile from the dashboard first, then return here to manage it.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">Athlete Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile, physiology, and training philosophy.</p>
      </div>

      {message && (
        <p className={`text-sm ${message.type === "error" ? "text-destructive" : "text-primary"}`}>{message.text}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Profile</CardTitle>
          <CardDescription>Identity and basic physiology.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>First name</Label>
                <Input value={form.first_name} onChange={set("first_name")} required />
              </div>
              <div>
                <Label>Last name</Label>
                <Input value={form.last_name} onChange={set("last_name")} required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Country</Label>
                <Input value={form.country} onChange={set("country")} placeholder="Australia" />
              </div>
              <div>
                <Label>Sex</Label>
                <Select value={form.sex} onValueChange={(v) => setForm((f) => ({ ...f, sex: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Age</Label>
                <Input type="number" value={form.age} onChange={set("age")} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Height (cm)</Label>
                <Input type="number" value={form.height_cm} onChange={set("height_cm")} />
              </div>
              <div>
                <Label>Weight (kg)</Label>
                <Input type="number" value={form.weight_kg} onChange={set("weight_kg")} />
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <h3 className="text-sm font-heading font-semibold mb-3">Heart rate & thresholds</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Max HR</Label>
                  <Input type="number" value={form.max_heart_rate} onChange={set("max_heart_rate")} />
                </div>
                <div>
                  <Label>Resting HR</Label>
                  <Input type="number" value={form.resting_hr} onChange={set("resting_hr")} />
                </div>
                <div>
                  <Label>Lactate threshold HR</Label>
                  <Input type="number" value={form.lactate_threshold_hr} onChange={set("lactate_threshold_hr")} />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <h3 className="text-sm font-heading font-semibold mb-3">Performance benchmarks</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>FTP (watts)</Label>
                  <Input type="number" value={form.ftp_watts} onChange={set("ftp_watts")} />
                </div>
                <div>
                  <Label>Threshold pace (m/s)</Label>
                  <Input type="number" step="0.01" value={form.functional_threshold_pace_ms} onChange={set("functional_threshold_pace_ms")} />
                </div>
                <div>
                  <Label>VDOT estimate</Label>
                  <Input type="number" step="0.1" value={form.vdot_estimate} onChange={set("vdot_estimate")} />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <h3 className="text-sm font-heading font-semibold mb-3">Training philosophy</h3>
              <Label>Training tier</Label>
              <Select
                value={form.training_tier_preference}
                onValueChange={(v) => setForm((f) => ({ ...f, training_tier_preference: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">Conservative (τc=10, τa=12)</SelectItem>
                  <SelectItem value="moderate">Moderate (τc=42, τa=7)</SelectItem>
                  <SelectItem value="aggressive">Aggressive (τc=20, τa=5)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Sets the CTL/ATL time constants used to compute your fitness and fatigue.
              </p>
            </div>

            <div className="pt-2 border-t border-border">
              <h3 className="text-sm font-heading font-semibold mb-3">Injury history</h3>
              <Textarea
                rows={3}
                value={form.injury_history}
                onChange={set("injury_history")}
                placeholder="e.g. ITB + Achilles + shin splints, Oct/Nov 2025"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Used to tailor prehab routines and load caps in generated plans.
              </p>
            </div>

            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="font-heading text-destructive flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" /> Danger zone
          </CardTitle>
          <CardDescription>Irreversible. Your profile is kept; everything else is deleted.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Permanently deletes all workouts, training plans, plan sessions, and telemetry for this profile.
            </p>
            <Button variant="destructive" onClick={handleReset} disabled={resetting}>
              {resetting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Reset all data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}