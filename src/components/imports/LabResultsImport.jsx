import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Upload, CheckCircle2, FlaskConical } from "lucide-react";

const TEST_TYPES = [
  { value: "blood_panel", label: "Blood panel" },
  { value: "lactate_threshold", label: "Lactate threshold" },
  { value: "vo2max", label: "VO₂max" },
  { value: "ferritin", label: "Ferritin" },
  { value: "hemoglobin", label: "Hemoglobin" },
  { value: "iron", label: "Iron" },
  { value: "vitamin_d", label: "Vitamin D" },
  { value: "cortisol", label: "Cortisol" },
  { value: "other", label: "Other" },
];

const EMPTY = {
  date: "",
  test_type: "blood_panel",
  metric_name: "",
  value: "",
  unit: "",
  reference_low: "",
  reference_high: "",
  notes: "",
};

export default function LabResultsImport({ athleteId }) {
  const [form, setForm] = useState(EMPTY);
  const [csv, setCsv] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const fileRef = useRef(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submitManual = async () => {
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      const res = await base44.functions.invoke("ingestLabResult", {
        athlete_id: athleteId,
        rows: [form],
        source: "manual",
      });
      const data = res.data || res;
      if (data.error) throw new Error(data.error);
      setInfo(`Saved ${data.ingested ?? 0} lab result(s).`);
      setForm({ ...EMPTY, date: form.date, test_type: form.test_type });
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Could not save lab result.");
    }
    setSubmitting(false);
  };

  const submitCsv = async () => {
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      const res = await base44.functions.invoke("ingestLabResult", {
        athlete_id: athleteId,
        csv,
        source: "csv",
      });
      const data = res.data || res;
      if (data.error) throw new Error(data.error);
      setInfo(
        `Imported ${data.ingested ?? 0} lab result(s)${
          data.skipped ? `, ${data.skipped} skipped` : ""
        }.`
      );
      setCsv("");
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "CSV import failed.");
    }
    setSubmitting(false);
  };

  const onFile = async (file) => {
    if (!file) return;
    const text = await file.text();
    setCsv(text);
  };

  const canSubmitManual = form.date && form.metric_name && form.value !== "" && form.unit;

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <p className="text-sm font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> Single result
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Date</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Test type</Label>
            <Select value={form.test_type} onValueChange={(v) => set("test_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TEST_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Metric name</Label>
            <Input
              placeholder="e.g. ferritin"
              value={form.metric_name}
              onChange={(e) => set("metric_name", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Value</Label>
            <Input
              type="number"
              step="any"
              placeholder="e.g. 42"
              value={form.value}
              onChange={(e) => set("value", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Unit</Label>
            <Input
              placeholder="e.g. ng/mL"
              value={form.unit}
              onChange={(e) => set("unit", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Ref range (low–high)</Label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                step="any"
                placeholder="low"
                value={form.reference_low}
                onChange={(e) => set("reference_low", e.target.value)}
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="number"
                step="any"
                placeholder="high"
                value={form.reference_high}
                onChange={(e) => set("reference_high", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1 col-span-2 sm:col-span-3">
            <Label className="text-xs">Notes (optional)</Label>
            <Input
              placeholder="e.g. fasting, lab name"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </div>
        <Button size="sm" onClick={submitManual} disabled={!canSubmitManual || submitting}>
          {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Plus className="w-4 h-4 mr-1.5" />}
          Save result
        </Button>
      </div>

      <div className="border-t border-border pt-4 space-y-3">
        <p className="text-sm font-medium flex items-center gap-2">
          <Upload className="w-4 h-4" /> CSV upload
        </p>
        <p className="text-xs text-muted-foreground">
          Columns: <code className="font-mono">date,test_type,metric_name,value,unit,reference_low,reference_high,notes</code>.
          One row per metric per date.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="w-4 h-4 mr-1.5" /> Choose CSV file
        </Button>
        <Textarea
          rows={5}
          placeholder="…or paste CSV here"
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          className="font-mono text-xs"
        />
        <Button size="sm" onClick={submitCsv} disabled={!csv.trim() || submitting}>
          {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FlaskConical className="w-4 h-4 mr-1.5" />}
          Import CSV
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
      {info && (
        <p className="text-xs text-primary flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" /> {info}
        </p>
      )}
    </div>
  );
}