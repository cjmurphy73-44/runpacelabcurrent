import React from "react";
import WipBadge from "@/components/common/WipBadge";

class WipErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("WipWrapper caught an error in an experimental feature:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-dashed border-destructive/40 bg-destructive/5 p-4 text-sm text-muted-foreground">
          This experimental feature hit an error and has been hidden. The rest of the app is unaffected.
        </div>
      );
    }
    return this.props.children;
  }
}

export default function WipWrapper({ isWip = false, label = "Coming Soon", children }) {
  if (!isWip) {
    return <WipErrorBoundary>{children}</WipErrorBoundary>;
  }

  return (
    <WipErrorBoundary>
      <div className="relative rounded-xl overflow-hidden">
        <div className="absolute top-2 right-2 z-10">
          <WipBadge />
        </div>
        <div className="pointer-events-none select-none opacity-50 blur-[2px]">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/30">
          <span className="px-3 py-1 rounded-full bg-card border border-border text-xs font-medium text-muted-foreground shadow-sm">
            {label}
          </span>
        </div>
      </div>
    </WipErrorBoundary>
  );
}