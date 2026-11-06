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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Menu, Users, Upload, Sparkles, Sun, Moon, Gauge, LayoutDashboard,
  ChevronDown, Wrench,
} from "lucide-react";
import { useUIPreferences } from "@/context/UIPreferencesContext";
import { useAuth } from "@/lib/AuthContext";
import ModeSwitch from "@/components/layout/ModeSwitch";
import { useCoachAccess } from "@/hooks/useCoachAccess";
import { cn } from "@/lib/utils";
import { PRIMARY_NAV, COACH_NAV, TOOL_GROUPS } from "@/components/layout/navItems";

/**
 * MobileNav — the slide-out sheet holding the full navigation surface on small
 * screens. It is a viewport-height column: the "Menu" header stays put while the
 * body scrolls, so every destination stays reachable in split-screen and short
 * layouts. Only the four primary training destinations are listed up front; the
 * tools stay collapsed until opened.
 */
export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useUIPreferences();
  const { isPro, canUseCoachWorkspace } = useCoachAccess();
  const { user } = useAuth();

  const isActive = (to) => location.pathname === to;

  const primaryClass = (to) =>
    cn(
      "flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium min-h-[44px]",
      isActive(to) ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"
    );

  const toolClass =
    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-foreground hover:bg-accent min-h-[44px]";

  const groupLabel =
    "px-1 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

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
      <SheetContent
        side="right"
        className="flex flex-col h-[100dvh] max-h-[100dvh] w-[300px] max-w-[86vw] sm:w-80 p-0 overflow-hidden"
      >
        <SheetHeader className="shrink-0 px-5 pt-5 pb-3 border-b border-border">
          <SheetTitle className="text-left">Menu</SheetTitle>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch] px-3 py-4 space-y-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {/* Primary training destinations — the short, fixed list */}
          <nav className="space-y-1" aria-label="Primary navigation">
            {PRIMARY_NAV.map((n) => (
              <SheetClose asChild key={n.to}>
                <Link to={n.to} className={primaryClass(n.to)} aria-current={isActive(n.to) ? "page" : undefined}>
                  <n.icon className="w-5 h-5" />
                  {n.label}
                </Link>
              </SheetClose>
            ))}
            <SheetClose asChild>
              <Link
                to={COACH_NAV.to}
                className={primaryClass(COACH_NAV.to)}
                aria-current={isActive(COACH_NAV.to) ? "page" : undefined}
              >
                <COACH_NAV.icon className="w-5 h-5" />
                {COACH_NAV.label}
              </Link>
            </SheetClose>
            {canUseCoachWorkspace && (
              <SheetClose asChild>
                <Link to="/roster" className={primaryClass("/roster")} aria-current={isActive("/roster") ? "page" : undefined}>
                  <Users className="w-5 h-5" />
                  Roster
                </Link>
              </SheetClose>
            )}
          </nav>

          {/* Everything else, collapsed until asked for */}
          <Collapsible open={toolsOpen} onOpenChange={setToolsOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-3 py-3 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent min-h-[44px]"
                aria-expanded={toolsOpen}
              >
                <span className="flex items-center gap-3">
                  <Wrench className="w-5 h-5" />
                  More tools
                </span>
                <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", toolsOpen && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-1 space-y-1">
              {TOOL_GROUPS.map((group) => (
                <div key={group.label} className="space-y-0.5">
                  <p className={groupLabel}>{group.label}</p>
                  {group.items.map((t) => (
                    <SheetClose asChild key={t.to}>
                      <Link to={t.to} className={toolClass} aria-current={isActive(t.to) ? "page" : undefined}>
                        <t.icon className="w-5 h-5 text-muted-foreground" />
                        {t.label}
                      </Link>
                    </SheetClose>
                  ))}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Standard / Geek mode */}
          <div className="px-2 pt-1">
            <ModeSwitch fullWidth />
            <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">
              Standard keeps it plain. Geek adds full terms, formulas and advanced metrics.
            </p>
          </div>

          {/* Appearance */}
          <div className="px-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center justify-between w-full px-3 py-2.5 rounded-md text-sm text-foreground hover:bg-accent min-h-[44px]"
            >
              <span className="flex items-center gap-3">
                {theme === "light" ? <Moon className="w-5 h-5 text-muted-foreground" /> : <Sun className="w-5 h-5 text-muted-foreground" />}
                Appearance
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                {theme === "light" ? "Light" : "Dark"}
              </span>
            </button>
          </div>

          {/* Account-level actions */}
          <div className="px-2 pt-3 border-t border-border space-y-1">
            {user?.role === "admin" && (
              <>
                <SheetClose asChild>
                  <Link to="/operations" className={toolClass} aria-current={isActive("/operations") ? "page" : undefined}>
                    <Gauge className="w-5 h-5 text-muted-foreground" />
                    Operations
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/admin" className={toolClass} aria-current={isActive("/admin") ? "page" : undefined}>
                    <LayoutDashboard className="w-5 h-5 text-muted-foreground" />
                    Admin
                  </Link>
                </SheetClose>
              </>
            )}
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