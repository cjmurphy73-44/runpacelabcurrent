import React from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useUIPreferences } from "@/context/UIPreferencesContext";
import { Button } from "@/components/ui/button";
import { Activity, MessageCircle, LogOut, CalendarRange, FlaskConical } from "lucide-react";

export default function AppLayout() {
  const { logout } = useAuth();
  const location = useLocation();
  const { showDeepMetrics, toggleDeepMetrics } = useUIPreferences();

  const navLink = (to, label, Icon) => (
    <Link
      to={to}
      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${
        location.pathname === to ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 font-heading font-bold text-lg">
            <Activity className="w-5 h-5" />
            Runpacelab
          </div>
          <nav className="flex items-center gap-2">
            {navLink("/", "Dashboard", Activity)}
            {navLink("/plan", "Training Plan", CalendarRange)}
            {navLink("/coach", "Coach", MessageCircle)}
            <Button
              variant={showDeepMetrics ? "secondary" : "ghost"}
              size="sm"
              onClick={toggleDeepMetrics}
              title="Toggle scientific metrics (CTL/ATL/TSB, VDOT)"
            >
              <FlaskConical className="w-4 h-4 mr-1" /> Geek Mode
            </Button>
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut className="w-4 h-4 mr-1" /> Logout
            </Button>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}