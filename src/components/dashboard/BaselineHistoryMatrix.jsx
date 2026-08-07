import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFitness } from "@/context/FitnessContext";

export default function BaselineHistoryMatrix({ athleteId }) {
  const { reload } = useFitness();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ vo2max: "", ftp: "", lthr: "", resting_hr: "" });
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(null);

  useEffect(() => {
    let alive = true;
    base44.entities.AthleteProfile.get(athleteId)
      .then((p) => { if (alive) setProfile(p); })
      .catch(() => { if (alive) setProfile(null); });
    return () => { alive = false; };
  }, [athleteId]);

  const handleSave = async () => {
    setSaving(true);
    setSavedMsg(null);
    const payload = {};
    if (form.vo2max !== "") payload.vdot_estimate = Number(form.vo2max);
    if (form.ftp !== "") payload.ftp_watts = Number(form.ftp);
    if (form.lthr !== "") payload.lactate_threshold_hr = Number(form.lthr);
    if (form.resting_hr !== "") payload.resting_hr = Number(form.resting_hr);
    try {
      await base44.entities.AthleteProfile.update(athleteId, payload);
      const refreshed = await base44.entities.AthleteProfile.get(athleteId);
      setProfile(refreshed);
      setForm({ vo2max: "", ftp: "", lthr: "", resting_hr: "" });
      setSavedMsg("Benchmarks updated.");
      await reload();
    } catch (e) {
      setSavedMsg("Update failed: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-heading">Aerobic Benchmarks</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">VO2 / VDOT</span>
            <div className="font-medium">{profile?.vdot_estimate ?? "—"}</div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">FTP (W)</span>
            <div className="font-medium">{profile?.ftp_watts ?? "—"}</div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">LTHR (bpm)</span>
            <div className="font-medium">{profile?.lactate_threshold_hr ?? "—"}</div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Resting HR</span>
            <div className="font-medium">{profile?.resting_hr ?? "—"}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-border pt-4">
          <Input type="number" placeholder="VO2 Max" value={form.vo2max} onChange={(e) => setForm({ ...form, vo2max: e.target.value })} />
          <Input type="number" placeholder="FTP (W)" value={form.ftp} onChange={(e) => setForm({ ...form, ftp: e.target.value })} />
          <Input type="number" placeholder="LTHR" value={form.lthr} onChange={(e) => setForm({ ...form, lthr: e.target.value })} />
          <Input type="number" placeholder="Resting HR" value={form.resting_hr} onChange={(e) => setForm({ ...form, resting_hr: e.target.value })} />
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Update Benchmarks from Latest Test"}</Button>
        {savedMsg && <p className="text-xs text-primary">{savedMsg}</p>}
      </CardContent>
    </Card>
  );
}