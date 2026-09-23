import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Activity, Gauge, HeartPulse, Sparkles, Watch } from "lucide-react";
import { deriveOnboardingProfile, RACE_DISTANCES } from "@/science/daniels";
import { deriveNoviceBaseline } from "@/science/noviceBaseline";
import WearableStep from "@/components/onboarding/WearableStep";

const TIER_CONSTS = {
  conservative: { ctl: 10, atl: 12 },
  moderate: { ctl: 42, atl: 7 },
  aggressive: { ctl: 20, atl: 5 },
};

function ageFromDob(dob) {
  if (!dob) return null;
  const n = new Date().getFullYear() - new Date(dob).getFullYear();
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function OnboardingFlow({ onCreated }) {
  const [form, setForm] = useState({
    first_name: "", last_name: "", sex: "male", dob: "", age: "",
    raceDistance: "5k", raceMinutes: "", raceSeconds: "", weeklyMileage: "", tier: "moderate",
    noviceMode: false, easyDistance: "", easyMinutes: "", effort: "easy",
    wearables: [],
  });
  const [overrides, setOverrides] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const derived = useMemo(() => {
    const age = form.age ? Number(form.age) : ageFromDob(form.dob);
    if (age == null) return null;
    if (form.noviceMode) {
      const ed = Number(form.easyDistance);
      const em = Number(form.easyMinutes);
      if (!ed && !Number(form.weeklyMileage)) return null;
      try {
        return deriveNoviceBaseline({
          age,
          sex: form.sex,
          weeklyMileageKm: Number(form.weeklyMileage) || 0,
          easyRunDistanceKm: ed || undefined,
          easyRunMinutes: em || undefined,
          effort: form.effort,
        });
      } catch { return null; }
    }
    const dist = RACE_DISTANCES.find((d) => d.key === form.raceDistance);
    const t = Number(form.raceMinutes) * 60 + Number(form.raceSeconds);
    if (!dist || !t || t < 180) return null;
    try {
      return deriveOnboardingProfile({
        raceDistanceMeters: dist.meters,
        raceTimeSeconds: t,
        age,
        sex: form.sex,
        weeklyMileageKm: Number(form.weeklyMileage) || 0,
      });
    } catch { return null; }
  }, [form]);

  const eff = (field) => (overrides[field] != null && overrides[field] !== "" ? overrides[field] : derived?.[field]);

  const submit = async (e) => {
    e.preventDefault();
    if (!derived) { setError(form.noviceMode ? "Add an easy run (distance + time) or weekly mileage to estimate a baseline." : "Add a recent race result so we can derive your baseline."); return; }
    if (!form.first_name || !form.last_name) { setError("First and last name are required."); return; }
    setSaving(true); setError("");
    try {
      const consts = TIER_CONSTS[form.tier];
      const age = form.age ? Number(form.age) : ageFromDob(form.dob);
      const profile = await base44.entities.AthleteProfile.create({
        first_name: form.first_name, last_name: form.last_name,
        sex: form.sex || undefined, age: age || undefined,
        training_tier_preference: form.tier,
        max_heart_rate: Number(eff("maxHr")) || undefined,
        lactate_threshold_hr: Number(eff("lactateThresholdHr")) || undefined,
        functional_threshold_pace_ms: Number(eff("thresholdPaceMs")) || undefined,
        vdot_estimate: Number(eff("vdot")) || undefined,
        current_ctl: Number(eff("seedCtl")) || 0, current_atl: Number(eff("seedAtl")) || 0, current_tsb: Number(eff("seedTsb")) || 0,
        ctl_time_constant_days: consts.ctl, atl_time_constant_days: consts.atl,
        primary_wearables: form.wearables.length ? form.wearables : undefined,
      });
      // S5: stamp this profile's id onto the owning user so health-data RLS can scope reads.
      // Must happen immediately after profile creation so the dashboard never renders blank.
      try { await base44.auth.updateMe({ athlete_profile_id: profile.id }); } catch (e) { console.warn("updateMe athlete_profile_id failed:", e); }
      onCreated(profile);
    } catch (e) { setError(e?.response?.data?.error || "Could not create profile."); }
    finally { setSaving(false); }
  };

  const override = (field) => (e) => setOverrides((o) => ({ ...o, [field]: e.target.value }));

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="font-heading flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Build your athlete profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>First name</Label><Input value={form.first_name} onChange={set("first_name")} required /></div>
            <div><Label>Last name</Label><Input value={form.last_name} onChange={set("last_name")} required /></div>
          </div>
          <div className="flex gap-1 rounded-md border border-border p-0.5 w-fit">
            <button type="button" onClick={() => setForm((f) => ({ ...f, noviceMode: false }))} className={`px-3 h-8 rounded-[5px] text-xs font-medium ${!form.noviceMode ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>I have a race time</button>
            <button type="button" onClick={() => setForm((f) => ({ ...f, noviceMode: true }))} className={`px-3 h-8 rounded-[5px] text-xs font-medium ${form.noviceMode ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>I'm new — no race yet</button>
          </div>

          {form.noviceMode ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="col-span-2">
                <Label>Recent easy run — distance (km)</Label>
                <Input type="number" min="0" step="0.1" value={form.easyDistance} onChange={set("easyDistance")} placeholder="e.g. 5" />
              </div>
              <div>
                <Label>Time (min)</Label>
                <Input type="number" min="0" value={form.easyMinutes} onChange={set("easyMinutes")} placeholder="e.g. 30" />
              </div>
              <div>
                <Label>It felt…</Label>
                <Select value={form.effort} onValueChange={(v) => setForm((f) => ({ ...f, effort: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="steady">Steady</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 sm:col-span-4">
                <p className="text-xs text-muted-foreground">No easy run handy? Just enter your weekly mileage below and we'll estimate from that.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Label>Recent race</Label>
                <Select value={form.raceDistance} onValueChange={(v) => setForm((f) => ({ ...f, raceDistance: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RACE_DISTANCES.map((d) => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Finish time (mm:ss)</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" min="0" value={form.raceMinutes} onChange={set("raceMinutes")} placeholder="20" className="w-20" />
                  <span className="text-muted-foreground">:</span>
                  <Input type="number" min="0" max="59" value={form.raceSeconds} onChange={set("raceSeconds")} placeholder="00" className="w-20" />
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div><Label>Date of birth</Label><Input type="date" value={form.dob} onChange={set("dob")} /></div>
            <div><Label>or Age</Label><Input type="number" min="1" value={form.age} onChange={set("age")} placeholder="—" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Sex</Label>
              <Select value={form.sex} onValueChange={(v) => setForm((f) => ({ ...f, sex: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Weekly mileage (km)</Label><Input type="number" min="0" value={form.weeklyMileage} onChange={set("weeklyMileage")} placeholder="40" /></div>
          </div>

          {derived && (
            <Card className="bg-muted/40 border-dashed">
              <CardContent className="pt-5 space-y-3">
                <div className="text-sm font-medium flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Auto-derived baseline</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <Metric icon={Gauge} label="VDOT" value={eff("vdot")?.toFixed(1)} />
                  <Metric icon={Activity} label="T-Pace" value={eff("thresholdPaceFormatted")} />
                  <Metric icon={HeartPulse} label="Max HR" value={`${eff("maxHr")} bpm`} />
                  <Metric icon={HeartPulse} label="LTHR" value={`${eff("lactateThresholdHr")} bpm`} />
                </div>
                <div className="text-xs text-muted-foreground font-mono tabular-nums">
                  CTL {eff("seedCtl")} · ATL {eff("seedAtl")} · TSB {eff("seedTsb")} &nbsp;|&nbsp; HR zones (Z1→Z5):{" "}
                  {["zone1","zone2","zone3","zone4","zone5"].map((z) => `${derived.hrZones[z].minBpm}-${derived.hrZones[z].maxBpm}`).join(" / ")}
                </div>
              </CardContent>
            </Card>
          )}

          <Accordion type="single" collapsible>
            <AccordionItem value="adv" className="border-0">
              <AccordionTrigger className="text-sm text-muted-foreground hover:no-underline">Advanced tuning — override any auto-derived metric</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <AdvInput label="VDOT" value={eff("vdot") ?? ""} onChange={override("vdot")} />
                  <AdvInput label="Threshold pace (m/s)" value={eff("thresholdPaceMs") ?? ""} onChange={override("thresholdPaceMs")} placeholder="e.g. 4.17" />
                  <AdvInput label="Max HR" value={eff("maxHr") ?? ""} onChange={override("maxHr")} />
                  <AdvInput label="LTHR" value={eff("lactateThresholdHr") ?? ""} onChange={override("lactateThresholdHr")} />
                  <AdvInput label="Seed CTL" value={eff("seedCtl") ?? ""} onChange={override("seedCtl")} />
                  <AdvInput label="Seed ATL" value={eff("seedAtl") ?? ""} onChange={override("seedAtl")} />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/20">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Watch className="w-4 h-4 text-primary" /> Your hardware stack
            </div>
            <WearableStep selected={form.wearables} onToggle={(keys) => setForm((f) => ({ ...f, wearables: keys }))} />
          </div>

          <div>
            <Label>Training philosophy</Label>
            <Select value={form.tier} onValueChange={(v) => setForm((f) => ({ ...f, tier: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="conservative">Conservative (τc=10, τa=12)</SelectItem>
                <SelectItem value="moderate">Moderate (τc=42, τa=7)</SelectItem>
                <SelectItem value="aggressive">Aggressive (τc=20, τa=5)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={saving || !derived} className="w-full">
            {saving ? "Creating…" : derived ? "Create profile" : form.noviceMode ? "Add an easy run or weekly mileage to estimate" : "Enter a race result to derive your baseline"}
          </Button>
          <p className="text-xs text-muted-foreground">{form.noviceMode ? "From an easy run (or weekly mileage), age and sex we estimate a baseline VDOT, threshold pace, max HR and heart-rate zones. Log a real race or threshold run later to lock it in." : "From one race time, age and mileage we derive your VDOT, threshold pace, max HR, heart-rate zones and starting fitness seeds. Adjust anything under Advanced tuning, or change later in Settings."}</p>
        </form>
      </CardContent>
    </Card>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="w-3.5 h-3.5" />{label}</div>
      <div className="text-base font-heading font-semibold tabular-nums">{value ?? "—"}</div>
    </div>
  );
}

function AdvInput({ label, value, onChange, placeholder }) {
  return (
    <div><Label className="text-xs">{label}</Label><Input type="number" value={value ?? ""} onChange={onChange} placeholder={placeholder} /></div>
  );
}