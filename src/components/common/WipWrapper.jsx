import React from "react";
import WipBadge from "@/components/common/WipBadge";

// Re-export so consumers can import the whole experimental-lab kit from one place:
//   import WipWrapper, { WipBadge, ErrorBoundary } from "@/components/common/WipWrapper";
export { WipBadge };

// Keeps an in-development view from crashing the rest of the app: any render error
// inside an experimental feature is caught and rendered as a discreet fallback,
// so core workout pages stay unaffected while the feature is stabilizing.
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("WipWrapper caught an error in an experimental feature:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-dashed border-destructive/40 bg-destructive/5 p-4 space-y-2">
          <p className="text-sm text-muted-foreground">
            This experimental feature hit an error and has been hidden. The rest of the app is unaffected.
          </p>
          {this.state.error?.message ? (
            <p className="text-xs font-mono break-all bg-muted rounded-md p-2 text-muted-foreground">
              {this.state.error.message}
            </p>
          ) : null}
        </div>
      );
    }
    return this.props.children;
  }
}

// Wrap an in-development view with isWip={true} and a featureName to render it safely as a
// "coming soon" lab preview: blurred, non-interactive, with a Lab badge + label overlay,
// all inside an ErrorBoundary. Pass isWip={false} (or omit) to render the children normally
// (still guarded by the ErrorBoundary).
export default function WipWrapper({ isWip = false, featureName, label = "Coming Soon", children }) {
  const overlayLabel = featureName || label;

  if (!isWip) {
    return <ErrorBoundary>{children}</ErrorBoundary>;
  }

  return (
    <ErrorBoundary>
      <div className="relative rounded-xl overflow-hidden">
        <div className="absolute top-2 right-2 z-10">
          <WipBadge />
        </div>
        <div className="pointer-events-none select-none opacity-50 blur-[2px]">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/30">
          <span className="px-3 py-1 rounded-full bg-card border border-border text-xs font-medium text-muted-foreground shadow-sm">
            {overlayLabel}
          </span>
        </div>
      </div>
    </ErrorBoundary>
  );
}