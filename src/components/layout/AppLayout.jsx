import React, { useState, Suspense } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import ToolsDropdown from "@/components/layout/ToolsDropdown";
import AccountMenu from "@/components/layout/AccountMenu";
import BetaFeedbackModal from "@/components/feedback/BetaFeedbackModal";
import { Activity, Sparkles, Users } from "lucide-react";
import { useCoachAccess } from "@/hooks/useCoachAccess";
import MobileNav from "@/components/layout/MobileNav";
import ThemeToggle from "@/components/layout/ThemeToggle";
import MobileTabBar from "@/components/layout/MobileTabBar";
import PageErrorBoundary from "@/components/common/PageErrorBoundary";
import PageTransition from "@/components/layout/PageTransition";
import { PRIMARY_NAV } from "@/components/layout/navItems";
import PlanBadge from "@/components/billing/PlanBadge";
import { OfflineSyncProvider, NetworkStatusBadge, SyncErrorBoundary } from "@/components/layout/offlineSyncAdapters";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const { isPro, coachMode, plan, canUseCoachWorkspace } = useCoachAccess();
  const isCoach = canUseCoachWorkspace;

  const navLink = (to, label, Icon) => (
    <Link
      to={to}
      title={label}
      className={`flex items-center gap-2 px-2 sm:px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors duration-150 ${
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
          <header className="border-b border-border sticky top-0 bg-background/85 backdrop-blur z-30 pt-safe">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 py-3">
              <div className="flex items-center gap-6 min-w-0">
                <Link to="/app" className="flex items-center gap-2 font-heading font-bold text-lg shrink-0">
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
            {!isPro && (
              <Button asChild variant="default" size="sm" title="Upgrade plan" className="hidden lg:inline-flex gap-1.5">
                <Link to="/subscribe"><Sparkles className="w-4 h-4" /><span className="hidden sm:inline">Upgrade</span></Link>
              </Button>
            )}
            {isPro && (
              <PlanBadge plan={plan} className="hidden sm:inline-flex" />
            )}
            <AccountMenu onFeedback={() => setFeedbackOpen(true)} onLogout={logout} />
          </div>
        </div>
      </header>
      <BetaFeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <main className="max-w-7xl mx-auto px-4 py-8 pb-24 md:pb-8">
        <PageErrorBoundary>
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-24">
                <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
              </div>
            }
          >
            <PageTransition>
              <Outlet />
            </PageTransition>
          </Suspense>
        </PageErrorBoundary>
      </main>
          <MobileTabBar />
        </div>
      </OfflineSyncProvider>
    </SyncErrorBoundary>
  );
}