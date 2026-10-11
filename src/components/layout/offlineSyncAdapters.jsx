import React, { useState, useEffect, createContext, useContext } from "react";
import offlineSyncQueue from "@/services/offlineSyncQueue";

// --- REACT CONTEXT & PROVIDER (adapts the framework-agnostic OfflineSyncQueueService) ---
const OfflineSyncContext = createContext(null);

export function OfflineSyncProvider({ children }) {
  const [state, setState] = useState(() => offlineSyncQueue.getStatus());

  useEffect(() => {
    const handler = () => setState(offlineSyncQueue.getStatus());
    offlineSyncQueue.on("status", handler);
    return () => offlineSyncQueue.off("status", handler);
  }, []);

  const enqueueMutation = (action, payload) => offlineSyncQueue.enqueue(action, payload);
  const syncNow = () => offlineSyncQueue.processQueue();
  const value = { ...state, queue: offlineSyncQueue.getQueue(), enqueueMutation, syncNow };

  return (
    <OfflineSyncContext.Provider value={value}>
      {children}
    </OfflineSyncContext.Provider>
  );
}

export function useOfflineSync() {
  return useContext(OfflineSyncContext);
}

// --- NETWORK STATUS BADGE UI COMPONENT ---
export function NetworkStatusBadge() {
  const ctx = useContext(OfflineSyncContext);
  const isOnline = ctx?.isOnline ?? navigator.onLine;
  const syncInProgress = ctx?.syncInProgress ?? false;
  const queueCount = ctx?.pendingCount ?? 0;
  const syncNow = ctx?.syncNow;

  return (
    <div className="flex items-center space-x-2 min-w-0">
      <div
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border transition-all min-w-0 ${
          !isOnline
            ? "bg-warning/10 text-warning border-warning/30 shadow-sm"
            : syncInProgress
            ? "bg-primary/10 text-primary border-primary/30 animate-pulse"
            : queueCount > 0
            ? "bg-accent text-accent-foreground border-border"
            : "bg-success/10 text-success border-success/30"
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full mr-1.5 shrink-0 ${
            !isOnline ? "bg-warning" : syncInProgress ? "bg-primary" : queueCount > 0 ? "bg-accent-foreground" : "bg-success"
          }`}
        />
        <span className="truncate">
          {!isOnline
            ? `Offline (${queueCount} queued)`
            : syncInProgress
            ? "Syncing changes..."
            : queueCount > 0
            ? `Syncing (${queueCount})`
            : "Online & Synced"}
        </span>
        {queueCount > 0 && isOnline && !syncInProgress && syncNow && (
          <button
            onClick={() => syncNow().catch((err) => alert(err.message))}
            className="ml-2 underline hover:opacity-80 font-bold uppercase text-[10px]"
          >
            Sync Now
          </button>
        )}
      </div>
    </div>
  );
}

// --- ERROR BOUNDARY WRAPPER ---
export class SyncErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("SyncManager Error Boundary caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive max-w-xl mx-auto my-4">
          <h3 className="text-sm font-bold uppercase tracking-wide">Sync Manager Encountered an Error</h3>
          <p className="text-xs mt-1 text-muted-foreground">{this.state.error?.message || "Unknown persistence error."}</p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="mt-3 px-3 py-1 bg-destructive text-destructive-foreground rounded text-xs font-semibold hover:bg-destructive/90"
          >
            Reload Sync Engine
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}