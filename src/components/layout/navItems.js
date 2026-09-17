import {
  Activity, LineChart, CalendarRange, MessageCircle,
  Gauge, CloudSun, LayoutGrid, Target, Trophy, KanbanSquare,
  FlaskConical, HeartPulse,
} from "lucide-react";

// Shared navigation model used by both the desktop header bar and the mobile
// slide-out menu, so the two stay in sync without duplication.

export const PRIMARY_NAV = [
  { to: "/app", label: "Dashboard", icon: Activity },
  { to: "/analytics", label: "Analytics", icon: LineChart },
  { to: "/plan", label: "Plan", icon: CalendarRange },
  { to: "/coach", label: "Coach", icon: MessageCircle },
];

export const CALCULATORS = [
  { to: "/vdot", label: "VDOT Calculator", icon: Gauge },
  { to: "/weather", label: "Weather Adjuster", icon: CloudSun },
  { to: "/zones", label: "Training Zones", icon: LayoutGrid },
];

export const INSIGHTS = [
  { to: "/predict", label: "Race Predictor", icon: Target },
  { to: "/pbs", label: "Race Ledger", icon: Trophy },
  { to: "/calendar", label: "Training Calendar", icon: CalendarRange },
  { to: "/kanban", label: "Training Board", icon: KanbanSquare },
];

export const LABS = [
  { to: "/physiology", label: "Physiology Lab", icon: FlaskConical },
  { to: "/recovery", label: "Recovery Center", icon: HeartPulse },
];