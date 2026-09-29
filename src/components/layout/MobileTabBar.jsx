import React from "react";
import { Link, useLocation } from "react-router-dom";
import { PRIMARY_NAV } from "@/components/layout/navItems";

// Fixed mobile-only bottom tab bar (visible below 768px). Mirrors PRIMARY_NAV so
// it stays in sync with the desktop header. Uses env(safe-area-inset-bottom) for
// native iOS home-indicator padding so the tabs sit above the gesture area.
export default function MobileTabBar() {
  const location = useLocation();
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur pb-safe"
      aria-label="Primary navigation"
    >
      <div className="flex items-stretch justify-around">
        {PRIMARY_NAV.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className="no-touch flex flex-1 flex-col items-center justify-center gap-0.5 py-2"
            >
              <Icon className={`w-5 h-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-[10px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}