import {
  Activity, LineChart, CalendarRange, CalendarDays, MessageCircle,
  Gauge, CloudSun, LayoutGrid, Target, Trophy, KanbanSquare,
  FlaskConical, HeartPulse, History, LayoutDashboard,
} from "lucide-react";

// Shared navigation model used by the desktop header, the mobile slide-out menu
// and the fixed mobile tab bar, so all three stay in sync without duplication.
//
// PRIMARY_NAV is deliberately short: the four destinations an athlete returns to
// while reviewing training. Everything else lives one level deeper.

export const PRIMARY_NAV = [
  { to: "/app", label: "Dashboard", icon: Activity },
  { to: "/plan", label: "Plan", icon: CalendarRange },
  { to: "/workouts", label: "Workouts", icon: History },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
];

// Reachable from the header and the menu, but not part of the four-tab bar.
export const COACH_NAV = { to: "/coach", label: "Coach", icon: MessageCircle };

export const CALCULATORS = [
  { to: "/vdot", label: "VDOT Calculator", icon: Gauge },
  { to: "/weather", label: "Weather Adjuster", icon: CloudSun },
  { to: "/zones", label: "Training Zones", icon: LayoutGrid },
];

export const INSIGHTS = [
  { to: "/analytics", label: "Analytics", icon: LineChart },
  { to: "/predict", label: "Race Predictor", icon: Target },
  { to: "/pbs", label: "Race Ledger", icon: Trophy },
  { to: "/kanban", label: "Training Board", icon: KanbanSquare },
];

export const LABS = [
  { to: "/physiology", label: "Physiology Lab", icon: FlaskConical },
  { to: "/recovery", label: "Recovery Center", icon: HeartPulse },
];

// Owner-only surfaces, shown in the Tools dropdown only when the user is an admin.
export const MANAGE = [
  { to: "/admin", label: "Admin", icon: LayoutDashboard, adminOnly: true },
  { to: "/operations", label: "Operations", icon: Gauge, adminOnly: true },
];

// Every non-primary tool destination, grouped, for the collapsed "More tools"
// section of the mobile menu.
export const TOOL_GROUPS = [
  { label: "Calculators", items: CALCULATORS },
  { label: "Insights", items: INSIGHTS },
  { label: "Labs", items: LABS },
];