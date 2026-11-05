import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { deriveOnboardingProfile, RACE_DISTANCES } from "@/science/daniels";
import { deriveNoviceBaseline } from "@/science/noviceBaseline";
import { useAuth } from "@/lib/AuthContext";
import { TIER_CONSTS } from "@/lib/trainingTiers";
import OnboardingProgress from "@/components/onboarding/OnboardingProgress";
import StepIdentity from "@/components/onboarding/StepIdentity";
import StepBaseline from "@/components/onboarding/StepBaseline";
import StepHardware from "@/components/onboarding/StepHardware";

function ageFromDob(dob) {
  if (!dob) return null;
  const n = new Date().getFullYear() - new Date(dob).getFullYear();
  return Number.isFinite(n) && n > 0 ? n : null;
}

const LAST_STEP = 2;

export default function OnboardingFlow({ onCreated }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    first_name: "", last_name: "", sex: "male", dob: "", age: "",
    raceDistance: "5k", raceMinutes: "", raceSeconds: "", weeklyMileage: "", tier: "moderate",
    noviceMode: false, easyDistance: "", easyMinutes: "", effort: "easy",
    wearables: [],
  });
  const [overrides, setOverrides] = useState({});
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const override = (field) => (e) => setOverrides((o) => ({ ...o, [field]: e.target.value }));

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

  const baselineHint = form.noviceMode
    ? "Add an easy run (distance + time) or weekly mileage to estimate a baseline."
    : "Add a recent race result so we can derive your baseline.";

  const goNext = () => {
    if (step === 0 && (!form.first_name.trim() || !form.last_name.trim())) {
      setError("Add your first and last name to continue.");
      return;
    }
    if (step === 1 && !derived) {
      setError(baselineHint);
      return;
    }
    setError("");
    setStep((s) => Math.min(LAST_STEP, s + 1));
  };

  const goBack = () => {
    setError("");
    setStep((s) => Math.max(0, s - 1));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (step < LAST_STEP) { goNext(); return; }
    if (!derived) { setError(baselineHint); return; }
    if (!form.first_name || !form.last_name) { setError("First and last name are required."); return; }
    setSaving(true); setError("");
    try {
      // Duplicate guard: if a profile already exists for this user (e.g. a prior onboarding
      // succeeded but the dashboard errored and re-showed this form), re-link to it instead
      // of creating a second profile. This is the exact path that previously produced
      // half a dozen duplicate stubs for one athlete.
      const existing = user?.id ? await base44.entities.AthleteProfile.filter({ created_by_id: user.id }, "-updated_date", 50) : [];
      const owned = existing.find((p) => p.created_by_id === user?.id) || existing[0];
      if (owned) {
        try { await base44.auth.updateMe({ athlete_profile_id: owned.id }); } catch (e) { console.warn("updateMe athlete_profile_id failed:", e); }
        try { base44.analytics.track({ eventName: "onboarding_complete", properties: { mode: "relink" } }); } catch {}
        onCreated(owned);
        return;
      }
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
      try { base44.analytics.track({ eventName: "onboarding_complete", properties: { mode: "new", tier: form.tier } }); } catch {}
      onCreated(profile);
    } catch (e) { setError(e?.response?.data?.error || "Could not create profile."); }
    finally { setSaving(false); }
  };

  const lastStep = step === LAST_STEP;

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="space-y-1.5">
        <CardTitle className="font-heading text-xl flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" /> Let's set you up
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Three short steps, then we'll get your first data in. Everything here is editable later.
        </p>
      </CardHeader>
      <CardContent>
        <OnboardingProgress step={step} />
        <form onSubmit={submit} className="space-y-5 mt-6">
          {step === 0 && <StepIdentity form={form} set={set} setForm={setForm} />}
          {step === 1 && (
            <StepBaseline form={form} set={set} setForm={setForm} derived={derived} eff={eff} override={override} />
          )}
          {step === 2 && <StepHardware form={form} setForm={setForm} />}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 pt-1">
            {step > 0 && (
              <Button type="button" variant="outline" onClick={goBack} disabled={saving}>
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            )}
            {lastStep ? (
              <Button type="submit" className="flex-1" disabled={saving || !derived}>
                {saving ? "Setting up…" : "Create my profile"}
                {!saving && <ArrowRight className="w-4 h-4" />}
              </Button>
            ) : (
              <Button type="button" className="flex-1" onClick={goNext}>
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>

          <p className="flex items-start gap-1.5 text-xs text-muted-foreground leading-relaxed">
            <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
            Your physiology data stays yours — it's used only to build your plan and estimates. Never sold, never shared.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}