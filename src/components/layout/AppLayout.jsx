import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useUIPreferences } from "@/context/UIPreferencesContext";
import { Button } from "@/components/ui/button";
import ToolsDropdown from "@/components/layout/ToolsDropdown";
import BetaFeedbackModal from "@/components/feedback/BetaFeedbackModal";
import { Activity, MessageCircle, LogOut, CalendarRange, FlaskConical, Settings, Upload, Megaphone, BrainCircuit } from "lucide-react";

export default function AppLayout() {
  const { logout } = useAuth();
  const location = useLocation();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  useUIPreferences();

  const navLink = (to, label, Icon) => (
    <Link
      to={to}
      title={label}
      className={`flex items-center gap-2 px-2 sm:px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
        location.pathname === to ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background/80 backdrop-blur z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6 min-w-0">
            <Link to="/" className="flex items-center gap-2 font-heading font-bold text-lg shrink-0">
              <Activity className="w-5 h-5 text-primary" />
              <span className="flex flex-col leading-none">
                <span>Trainpacelab</span>
                <span className="text-[10px] font-normal font-body text-muted-foreground tracking-wide uppercase">Multi-Sport Endurance</span>
              </span>
            </Link>
            <nav className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-w-0">
              {navLink("/", "Dashboard", Activity)}
              {navLink("/intelligence", "Intelligence", BrainCircuit)}
              {navLink("/plan", "Plan", CalendarRange)}
              {navLink("/coach", "Coach", MessageCircle)}
              <ToolsDropdown />
            </nav>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Link
              to="/physiology"
              title="Physiology Lab"
              className={`flex items-center justify-center h-9 w-9 rounded-md ${location.pathname === "/physiology" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
            >
              <FlaskConical className="w-4 h-4" />
            </Link>
            <Link to="/import" title="Imports" className="flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:bg-accent">
              <Upload className="w-4 h-4" />
            </Link>
            <Link to="/settings" title="Settings" className="flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:bg-accent">
              <Settings className="w-4 h-4" />
            </Link>
            <Button variant="ghost" size="sm" onClick={() => setFeedbackOpen(true)} title="Send beta feedback" className="gap-1.5">
              <Megaphone className="w-4 h-4" />
              <span className="hidden lg:inline text-sm">Feedback</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => logout()} title="Logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>
      <BetaFeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}