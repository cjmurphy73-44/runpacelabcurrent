import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Step 1 — only what every calculation downstream actually needs.
export default function StepIdentity({ form, set, setForm }) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Just the basics. These two answers let us estimate your heart-rate zones and calorie burn.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="first_name">First name</Label>
          <Input id="first_name" value={form.first_name} onChange={set("first_name")} autoComplete="given-name" required />
        </div>
        <div>
          <Label htmlFor="last_name">Last name</Label>
          <Input id="last_name" value={form.last_name} onChange={set("last_name")} autoComplete="family-name" required />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="dob">Date of birth</Label>
          <Input id="dob" type="date" value={form.dob} onChange={set("dob")} />
        </div>
        <div>
          <Label htmlFor="age">…or just your age</Label>
          <Input id="age" type="number" min="1" value={form.age} onChange={set("age")} placeholder="e.g. 34" />
        </div>
      </div>
      <div>
        <Label>Sex</Label>
        <Select value={form.sex} onValueChange={(v) => setForm((f) => ({ ...f, sex: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1.5">
          Used only for physiological estimates — never shared.
        </p>
      </div>
    </div>
  );
}