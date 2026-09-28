import React from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, RotateCw } from "lucide-react";

const reported = new Set();

// Per-widget error boundary: isolates a single dashboard card so one bad
// widget never blanks the whole dashboard. Reports the crash to the same
// Airtable error log as PageErrorBoundary, keyed by widget name + route, so
// we can pin the exact card behind a blank-screen report.
export default class WidgetBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error(`[WidgetBoundary:${this.props.name || "widget"}]`, error, info);
    const route = typeof window !== "undefined" ? window.location.pathname : "";
    const sig = `${this.props.name || "widget"}|${error?.message || "unknown"}|${route}`;
    if (reported.has(sig)) return;
    reported.add(sig);
    const payload = {
      message: `[${this.props.name || "widget"}] ${error?.message || String(error)}`,
      stack: error?.stack || (info?.componentStack ? String(info.componentStack) : ""),
      route,
      severity: "Medium",
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

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {this.props.name ? `${this.props.name} couldn't load` : "This widget couldn't load"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your data is safe — the rest of the dashboard is unaffected.
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="shrink-0 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCw className="w-3 h-3" /> Retry
          </button>
        </div>
      </div>
    );
  }
}