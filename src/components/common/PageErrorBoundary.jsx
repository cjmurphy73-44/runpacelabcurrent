import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";

// Crash signatures already reported this session — prevents a render loop from
// flooding Airtable with duplicate User Error Reports rows.
const reportedCrashes = new Set();

// Wraps a major view (Dashboard, Recovery Center, Settings) so that an unexpected
// runtime error renders a polite recovery card instead of a white screen of death.
export default class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("[PageErrorBoundary]", error, info);
    const route = typeof window !== "undefined" ? window.location.pathname : "";
    const sig = `${error?.message || "unknown"}|${route}`;
    if (reportedCrashes.has(sig)) return;
    reportedCrashes.add(sig);
    const payload = {
      message: error?.message || String(error),
      stack: error?.stack || (info?.componentStack ? String(info.componentStack) : ""),
      route,
      severity: "High",
    };
    // Fire-and-forget: a reporting failure must never block recovery.
    (async () => {
      try {
        let userEmail = "anonymous";
        try {
          const me = await base44.auth.me();
          if (me?.email) userEmail = me.email;
        } catch {}
        await base44.functions.invoke("logErrorToAirtable", { ...payload, userEmail });
      } catch {}
    })();
  }

  handleReset = () => this.setState({ error: null });

  handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="py-12 flex justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 space-y-4 text-center">
            <div className="mx-auto w-11 h-11 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <h2 className="font-heading font-bold text-lg">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">
              This view hit an unexpected error. Your data is safe — try again, or reload the page to recover.
            </p>
            {this.state.error?.message ? (
              <p className="text-xs text-muted-foreground font-mono break-all bg-muted rounded-md p-2">
                {this.state.error.message}
              </p>
            ) : null}
            <div className="flex gap-2 justify-center pt-1">
              <Button variant="outline" onClick={this.handleReset}>Try again</Button>
              <Button onClick={this.handleReload}>Reload page</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}