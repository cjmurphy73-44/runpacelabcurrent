import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Menu, Users, Upload, Sparkles, Microscope, Zap } from "lucide-react";
import { useUIPreferences } from "@/context/UIPreferencesContext";
import { useCoachAccess } from "@/hooks/useCoachAccess";
import { cn } from "@/lib/utils";
import { PRIMARY_NAV, CALCULATORS, INSIGHTS, LABS } from "@/components/layout/navItems";

/**
 * MobileNav — a slide-out sheet that holds the full navigation surface on
 * small screens, so the top bar can stay minimal (logo + account + this
 * trigger). Surfaces primary routes, tools, the Scientific/Simplified lens,
 * the deep-metrics toggle, and the import/upgrade actions in one organised
 * place instead of cramming them all into the header row.
 */
export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { lens, setLens, showDeepMetrics, toggleDeepMetrics } = useUIPreferences();
  const { isPro, coachMode } = useCoachAccess();

  const isActive = (to) => location.pathname === to;

  const primaryClass = (to) =>
    cn(
      "flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium min-h-[44px]",
      isActive(to) ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"
    );

  const toolClass =
    "flex items-center gap-3 px-3 py-3 rounded-md text-sm text-foreground hover:bg-accent min-h-[44px]";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          className="flex items-center justify-center h-11 w-11 rounded-md text-muted-foreground hover:bg-accent"
        >
          <Menu className="w-5 h-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-80 p-0">
        <SheetHeader className="px-5 pt-5 pb-3">
          <SheetTitle className="text-left">Menu</SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto px-3 pb-6 space-y-5">
          {/* Lens toggle */}
          <div className="px-2">
            <div className="flex items-center rounded-md border border-border p-0.5">
              <button
                type="button"
                onClick={() => setLens("scientific")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-2 h-9 rounded-[5px] text-xs font-medium",
                  lens === "scientific" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                )}
              >
                <Microscope className="w-3.5 h-3.5" /> Scientific
              </button>
              <button
                type="button"
                onClick={() => setLens("simplified")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-2 h-9 rounded-[5px] text-xs font-medium",
                  lens === "simplified" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                )}
              >
                <Zap className="w-3.5 h-3.5" /> Simplified
              </button>
            </div>
          </div>

          {/* Primary nav */}
          <nav className="space-y-1">
            {PRIMARY_NAV.map((n) => (
              <SheetClose asChild key={n.to}>
                <Link to={n.to} className={primaryClass(n.to)} aria-current={isActive(n.to) ? "page" : undefined}>
                  <n.icon className="w-5 h-5" />
                  {n.label}
                </Link>
              </SheetClose>
            ))}
            {coachMode && (
              <SheetClose asChild>
                <Link to="/roster" className={primaryClass("/roster")} aria-current={isActive("/roster") ? "page" : undefined}>
                  <Users className="w-5 h-5" />
                  Roster
                </Link>
              </SheetClose>
            )}
          </nav>

          {/* Tools */}
          <div className="px-2 space-y-1">
            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Calculators
            </p>
            {CALCULATORS.map((t) => (
              <SheetClose asChild key={t.to}>
                <Link to={t.to} className={toolClass}>
                  <t.icon className="w-5 h-5 text-muted-foreground" />
                  {t.label}
                </Link>
              </SheetClose>
            ))}
            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 mt-3">
              Insights
            </p>
            {INSIGHTS.map((t) => (
              <SheetClose asChild key={t.to}>
                <Link to={t.to} className={toolClass}>
                  <t.icon className="w-5 h-5 text-muted-foreground" />
                  {t.label}
                </Link>
              </SheetClose>
            ))}
            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 mt-3">
              Labs
            </p>
            {LABS.map((t) => (
              <SheetClose asChild key={t.to}>
                <Link to={t.to} className={toolClass} aria-current={isActive(t.to) ? "page" : undefined}>
                  <t.icon className="w-5 h-5 text-muted-foreground" />
                  {t.label}
                </Link>
              </SheetClose>
            ))}
          </div>

          {/* Deep metrics toggle */}
          <div className="px-2">
            <button
              type="button"
              onClick={toggleDeepMetrics}
              className="flex items-center justify-between w-full px-3 py-2.5 rounded-md text-sm text-foreground hover:bg-accent"
            >
              <span className="flex items-center gap-3">
                <Microscope className="w-5 h-5 text-muted-foreground" />
                Scientific mode
              </span>
              <span
                className={cn(
                  "text-xs font-medium",
                  showDeepMetrics ? "text-primary" : "text-muted-foreground"
                )}
              >
                {showDeepMetrics ? "On" : "Off"}
              </span>
            </button>
          </div>

          {/* Actions */}
          <div className="px-2 pt-3 border-t border-border space-y-1">
            <SheetClose asChild>
              <Link to="/import" className={toolClass} aria-current={isActive("/import") ? "page" : undefined}>
                <Upload className="w-5 h-5 text-muted-foreground" />
                Imports
              </Link>
            </SheetClose>
            {!isPro && (
              <SheetClose asChild>
                <Link
                  to="/subscribe"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-primary hover:bg-accent"
                >
                  <Sparkles className="w-5 h-5" />
                  Upgrade
                </Link>
              </SheetClose>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}