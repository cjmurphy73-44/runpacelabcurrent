import React from "react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Wrench, Microscope } from "lucide-react";
import { useUIPreferences } from "@/context/UIPreferencesContext";
import { CALCULATORS, INSIGHTS, LABS } from "@/components/layout/navItems";

export default function ToolsDropdown() {
  const { showDeepMetrics, toggleDeepMetrics } = useUIPreferences();
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
        {LABS.map((t) => (
          <DropdownMenuItem key={t.to} asChild>
            <Link to={t.to} className="flex items-center gap-2">
              <t.icon className="w-4 h-4" />
              {t.label}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked={showDeepMetrics} onCheckedChange={toggleDeepMetrics}>
          <Microscope className="w-4 h-4 mr-2" />
          Scientific mode
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}