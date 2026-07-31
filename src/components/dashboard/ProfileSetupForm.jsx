import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProfileSetupForm({ onCreated }) {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    sex: "",
    age: "",
    height_cm: "",
    weight_kg: "",
    training_tier_preference: "conservative",
    max_heart_rate: "",
    resting_hr: "",
    functional_threshold_pace_ms: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    let ctl_time_constant_days;
    let atl_time_constant_days;

    switch (form.training_tier_preference) {
      case "conservative":
        ctl_time_constant_days = 10;
        atl_time_constant_days = 12;
        break;
      case "moderate":
        ctl_time_constant_days = 42;
        atl_time_constant_days = 7;
        break;
      case "aggressive":
        ctl_time_constant_days = 20;
        atl_time_constant_days = 5;
        break;
      default:
        ctl_time_constant_days = 42;
        atl_time_constant_days = 7;
    }

    const profile = await base44.entities.AthleteProfile.create({
      first_name: form.first_name,
      last_name: form.last_name,
      sex: form.sex || undefined,
      age: form.age ? Number(form.age) : undefined,
      height_cm: form.height_cm ? Number(form.height_cm) : undefined,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : undefined,
      training_tier_preference: form.training_tier_preference,
      max_heart_rate: form.max_heart_rate ? Number(form.max_heart_rate) : undefined,
      resting_hr: form.resting_hr ? Number(form.resting_hr) : undefined,
      functional_threshold_pace_ms: form.functional_threshold_pace_ms ? Number(form.functional_threshold_pace_ms) : undefined,
      ctl_time_constant_days,
      atl_time_constant_days,
    });
    setSaving(false);
    onCreated(profile);
  };

  return (
    <Card className="max-w-xl mx-auto">
      <CardHeader>
        <CardTitle className="font-heading">Set up your athlete profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>First name</Label>
              <Input value={form.first_name} onChange={set("first_name")} required />
            </div>
            <div>
              <Label>Last name</Label>
              <Input value={form.last_name} onChange={set("last_name")} required />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
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
            <div>
              <Label>Max HR</Label>
              <Input type="number" value={form.max_heart_rate} onChange={set("max_heart_rate")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Height (cm)</Label>
              <Input type="number" value={form.height_cm} onChange={set("height_cm")} />
            </div>
            <div>
              <Label>Weight (kg)</Label>
              <Input type="number" value={form.weight_kg} onChange={set("weight_kg")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Resting HR</Label>
              <Input type="number" value={form.resting_hr} onChange={set("resting_hr")} placeholder="e.g., 50" />
            </div>
            <div>
              <Label>Functional Threshold Pace (m/s)</Label>
              <Input type="number" value={form.functional_threshold_pace_ms} onChange={set("functional_threshold_pace_ms")} placeholder="e.g., 4.5 (for a 6:00 min/km runner)" />
            </div>
          </div>
          <div>
            <Label>Training philosophy</Label>
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
          </div>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Creating..." : "Create profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}