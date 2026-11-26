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
import MobileTabBar from "@/components/layout/MobileTabBar";
import PageErrorBoundary from "@/components/common/PageErrorBoundary";
import PageTransition from "@/components/layout/PageTransition";
import { PRIMARY_NAV, COACH_NAV } from "@/components/layout/navItems";
import PlanBadge from "@/components/billing/PlanBadge";
import { OfflineSyncProvider, NetworkStatusBadge, SyncErrorBoundary } from "@/components/layout/offlineSyncAdapters";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const { isPro, plan, canUseCoachWorkspace } = useCoachAccess();
  const isCoach = canUseCoachWorkspace;

  const navLink = (to, label, Icon) => (
    <Link
      key={to}
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
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-2 sm:gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <Link to="/app" className="inline-flex min-h-11 shrink-0 items-center gap-2 font-heading font-bold tracking-tight sm:text-lg">
                  <Activity className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  TrainPaceLab
                </Link>
                <nav className="hidden lg:flex items-center gap-1 min-w-0 overflow-x-auto">
                  {PRIMARY_NAV.map((n) => navLink(n.to, n.label, n.icon))}
                  {navLink(COACH_NAV.to, COACH_NAV.label, COACH_NAV.icon)}
                  {isCoach && navLink("/roster", "Roster", Users)}
                  <ToolsDropdown />
                </nav>
              </div>
              <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                <NetworkStatusBadge />
                <div className="lg:hidden"><MobileNav /></div>
                {!isPro && (
                  <Button asChild variant="default" size="sm" title="Upgrade plan" className="hidden gap-1.5 lg:inline-flex">
                    <Link to="/subscribe"><Sparkles className="h-4 w-4" aria-hidden="true" /> Upgrade</Link>
                  </Button>
                )}
                {isPro && <PlanBadge plan={plan} className="hidden sm:inline-flex" />}
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
