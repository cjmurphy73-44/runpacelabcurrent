import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { RACE_DISTANCES } from "@/science/daniels";
import BaselinePreviewCard from "@/components/onboarding/BaselinePreviewCard";

function AdvInput({ label, value, onChange, placeholder, hint }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type="number" value={value ?? ""} onChange={onChange} placeholder={placeholder} />
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

// m/s → min/km, so the advanced field reads in the units people actually run in.
function paceHint(mps) {
  const v = Number(mps);
  if (!v || v <= 0) return null;
  const secPerKm = 1000 / v;
  return `≈ ${Math.floor(secPerKm / 60)}:${String(Math.round(secPerKm % 60)).padStart(2, "0")} /km`;
}

// Step 2 — the one number the whole plan is anchored to. Two ways in:
// a recent race, or (for someone brand new) an easy run / weekly mileage.
export default function StepBaseline({ form, set, setForm, derived, eff, override }) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        One recent effort is enough. Pick whichever you have — everything else is derived from it.
      </p>

      <div className="flex gap-1 rounded-md border border-border p-0.5 w-full sm:w-fit">
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, noviceMode: false }))}
          className={`flex-1 sm:flex-none px-3 h-8 rounded-[5px] text-xs font-medium ${!form.noviceMode ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          I have a race time
        </button>
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, noviceMode: true }))}
          className={`flex-1 sm:flex-none px-3 h-8 rounded-[5px] text-xs font-medium ${form.noviceMode ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          I'm new — no race yet
        </button>
      </div>

      {form.noviceMode ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Recent easy run — distance (km)</Label>
              <Input type="number" min="0" step="0.1" value={form.easyDistance} onChange={set("easyDistance")} placeholder="e.g. 5" />
            </div>
            <div>
              <Label>Time (min)</Label>
              <Input type="number" min="0" value={form.easyMinutes} onChange={set("easyMinutes")} placeholder="e.g. 30" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>How did it feel?</Label>
              <Select value={form.effort} onValueChange={(v) => setForm((f) => ({ ...f, effort: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy — could chat the whole way</SelectItem>
                  <SelectItem value="steady">Steady — breathing noticeable</SelectItem>
                  <SelectItem value="hard">Hard — couldn't hold much longer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Weekly mileage (km)</Label>
              <Input type="number" min="0" value={form.weeklyMileage} onChange={set("weeklyMileage")} placeholder="e.g. 25" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            No easy run handy? Just enter your weekly mileage — we'll estimate from that.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Recent race</Label>
            <Select value={form.raceDistance} onValueChange={(v) => setForm((f) => ({ ...f, raceDistance: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RACE_DISTANCES.map((d) => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Finish time</Label>
            <div className="flex items-center gap-2">
              <Input type="number" min="0" value={form.raceMinutes} onChange={set("raceMinutes")} placeholder="20" className="w-20" aria-label="Minutes" />
              <span className="text-muted-foreground">:</span>
              <Input type="number" min="0" max="59" value={form.raceSeconds} onChange={set("raceSeconds")} placeholder="00" className="w-20" aria-label="Seconds" />
              <span className="text-xs text-muted-foreground">mm : ss</span>
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label>Weekly mileage (km)</Label>
            <Input type="number" min="0" value={form.weeklyMileage} onChange={set("weeklyMileage")} placeholder="e.g. 40" />
            <p className="text-xs text-muted-foreground mt-1.5">
              Roughly how much you run in a normal week. It sets your starting fitness, so your first block isn't a jump.
            </p>
          </div>
        </div>
      )}

      <BaselinePreviewCard derived={derived} eff={eff} />

      {derived && (
        <Accordion type="single" collapsible>
          <AccordionItem value="adv" className="border-0">
            <AccordionTrigger className="text-sm text-muted-foreground hover:no-underline">
              Already know your numbers? Override any estimate
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <AdvInput label="VDOT" value={eff("vdot") ?? ""} onChange={override("vdot")} />
                <AdvInput
                  label="Threshold pace (m/s)"
                  value={eff("thresholdPaceMs") ?? ""}
                  onChange={override("thresholdPaceMs")}
                  placeholder="e.g. 4.17"
                  hint={paceHint(eff("thresholdPaceMs"))}
                />
                <AdvInput label="Max HR" value={eff("maxHr") ?? ""} onChange={override("maxHr")} />
                <AdvInput label="LTHR" value={eff("lactateThresholdHr") ?? ""} onChange={override("lactateThresholdHr")} />
                <AdvInput label="Seed CTL" value={eff("seedCtl") ?? ""} onChange={override("seedCtl")} />
                <AdvInput label="Seed ATL" value={eff("seedAtl") ?? ""} onChange={override("seedAtl")} />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}