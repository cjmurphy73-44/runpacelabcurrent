import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useUIPreferences } from "@/context/UIPreferencesContext";
import { Button } from "@/components/ui/button";
import ToolsDropdown from "@/components/layout/ToolsDropdown";
import AccountMenu from "@/components/layout/AccountMenu";
import BetaFeedbackModal from "@/components/feedback/BetaFeedbackModal";
import { Activity, Microscope, Zap, Sparkles, Upload, Users, LayoutDashboard } from "lucide-react";
import { useCoachAccess } from "@/hooks/useCoachAccess";
import MobileNav from "@/components/layout/MobileNav";
import PageErrorBoundary from "@/components/common/PageErrorBoundary";
import { PRIMARY_NAV } from "@/components/layout/navItems";
import { OfflineSyncProvider, NetworkStatusBadge, SyncErrorBoundary } from "@/services/offlineSyncQueue";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const { lens, setLens } = useUIPreferences();
  const { isPro, coachMode } = useCoachAccess();
  const isCoach = coachMode;

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
    <SyncErrorBoundary>
      <OfflineSyncProvider>
        <div className="min-h-screen bg-background">
          <header className="border-b border-border sticky top-0 bg-background/85 backdrop-blur z-30">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 py-3">
              <div className="flex items-center gap-6 min-w-0">
                <Link to="/" className="flex items-center gap-2 font-heading font-bold text-lg shrink-0">
                  <Activity className="w-5 h-5 text-primary" />
                  <span className="flex flex-col leading-none">
                    <span>Trainpacelab</span>
                    <span className="hidden sm:block text-[10px] font-normal font-body text-muted-foreground tracking-wide uppercase">Multi-Sport Endurance</span>
                  </span>
                </Link>
                <div className="hidden sm:block shrink-0">
                  <NetworkStatusBadge />
                </div>
                <nav className="hidden lg:flex items-center gap-1 min-w-0">
                  {PRIMARY_NAV.map((n) => navLink(n.to, n.label, n.icon))}
                  {isCoach && navLink("/roster", "Roster", Users)}
                  {user?.role === "admin" && navLink("/admin", "Admin", LayoutDashboard)}
                  <ToolsDropdown />
                </nav>
                <div className="lg:hidden">
                  <MobileNav />
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="sm:hidden">
                  <NetworkStatusBadge />
                </div>
                <div className="hidden lg:flex items-center rounded-md border border-border p-0.5 mr-1" title="Switch between Scientific and Simplified mode">
              <button
                type="button"
                onClick={() => setLens("scientific")}
                className={`flex items-center gap-1 px-2 h-8 rounded-[5px] text-xs font-medium transition-colors ${
                  lens === "scientific" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Microscope className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Scientific</span>
              </button>
              <button
                type="button"
                onClick={() => setLens("simplified")}
                className={`flex items-center gap-1 px-2 h-8 rounded-[5px] text-xs font-medium transition-colors ${
                  lens === "simplified" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Simplified</span>
              </button>
            </div>
            <Link to="/import" title="Imports" className="hidden lg:flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:bg-accent">
              <Upload className="w-4 h-4" />
            </Link>
            {!isPro && (
              <Button asChild variant="default" size="sm" title="Upgrade plan" className="hidden lg:inline-flex gap-1.5">
                <Link to="/subscribe"><Sparkles className="w-4 h-4" /><span className="hidden sm:inline">Upgrade</span></Link>
              </Button>
            )}
            <AccountMenu onFeedback={() => setFeedbackOpen(true)} onLogout={logout} />
          </div>
        </div>
      </header>
      <BetaFeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <PageErrorBoundary>
          <Outlet />
        </PageErrorBoundary>
      </main>
    </div>
  );
}