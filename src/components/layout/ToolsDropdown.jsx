import React from "react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Wrench, Gauge, CloudSun, LayoutGrid, Trophy, CalendarRange, FlaskConical } from "lucide-react";

const CALCULATORS = [
  { to: "/vdot", label: "VDOT Calculator", icon: Gauge },
  { to: "/weather", label: "Weather Adjuster", icon: CloudSun },
  { to: "/zones", label: "Training Zones", icon: LayoutGrid },
];

const INSIGHTS = [
  { to: "/pbs", label: "Race Ledger", icon: Trophy },
  { to: "/calendar", label: "Training Calendar", icon: CalendarRange },
  { to: "/physiology", label: "Physiology Lab", icon: FlaskConical },
];

export default function ToolsDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 px-2 sm:px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent whitespace-nowrap"
        >
          <Wrench className="w-4 h-4" />
          <span className="hidden sm:inline">Tools</span>
          <ChevronDown className="w-3 h-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Calculators</DropdownMenuLabel>
        {CALCULATORS.map((t) => (
          <DropdownMenuItem key={t.to} asChild>
            <Link to={t.to} className="flex items-center gap-2">
              <t.icon className="w-4 h-4" />
              {t.label}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Insights</DropdownMenuLabel>
        {INSIGHTS.map((t) => (
          <DropdownMenuItem key={t.to} asChild>
            <Link to={t.to} className="flex items-center gap-2">
              <t.icon className="w-4 h-4" />
              {t.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}