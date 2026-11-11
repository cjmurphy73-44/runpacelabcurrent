import React from "react";
import { Link } from "react-router-dom";
import { History, CalendarRange, HeartPulse, Upload, ClipboardList } from "lucide-react";

// Core training surfaces promoted onto the dashboard. Workouts, Calendar and
// Recovery are everyday athlete destinations, so they get one tap from the hero
// instead of living behind the Tools menu.
const ACTIONS = [
  { to: "/workouts", label: "Workouts", hint: "Every session", icon: History },
  { to: "/plan", label: "Training plan", hint: "Your upcoming sessions", icon: ClipboardList },
  { to: "/calendar", label: "Calendar", hint: "Planned & done", icon: CalendarRange },
  { to: "/recovery", label: "Recovery", hint: "Sleep & HRV", icon: HeartPulse },
  { to: "/import", label: "Import", hint: "Device or file", icon: Upload },
];

export default function DashboardQuickActions() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {ACTIONS.map(({ to, label, hint, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className="group flex items-center gap-3 rounded-md border border-border bg-card px-3 py-3 min-h-[56px] transition-colors hover:border-primary/60 hover:bg-primary/5"
        >
          <Icon className="w-4 h-4 text-primary shrink-0" />
          <span className="min-w-0">
            <span className="block text-sm font-medium truncate">{label}</span>
            <span className="block text-[11px] text-muted-foreground truncate">{hint}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
