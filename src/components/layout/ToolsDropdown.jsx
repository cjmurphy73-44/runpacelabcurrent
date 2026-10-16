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
import { ChevronDown, Wrench } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { CALCULATORS, INSIGHTS, LABS, MANAGE } from "@/components/layout/navItems";

export default function ToolsDropdown() {
  const { user } = useAuth();
  const manageItems = MANAGE.filter((m) => !m.adminOnly || user?.role === "admin");
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
        {manageItems.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Manage</DropdownMenuLabel>
            {manageItems.map((t) => (
              <DropdownMenuItem key={t.to} asChild>
                <Link to={t.to} className="flex items-center gap-2">
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}