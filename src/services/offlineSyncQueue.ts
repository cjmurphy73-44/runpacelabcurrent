import React, { useState, useEffect, createContext, useContext } from 'react';

// --- OFFLINE SYNC QUEUE SERVICE ---
class OfflineSyncQueueService {
  constructor() {
    this.STORAGE_KEY = 'run_pace_offline_sync_queue_v1';
    this.STATUS_KEY = 'run_pace_network_status_v1';
    this.listeners = new Set();
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;

    window.addEventListener('online', () => this.handleNetworkChange(true));
    window.addEventListener('offline', () => this.handleNetworkChange(false));
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    const state = this.getState();
    this.listeners.forEach(l => l(state));
  }

  getState() {
    return {
      isOnline: this.isOnline,
      queue: this.getQueue(),
      syncInProgress: this.syncInProgress,
    };
  }

  getQueue() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to read offline sync queue', e);
      return [];
    }
  }

  saveQueue(queue) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(queue));
      this.notify();
    } catch (e) {
      console.error('Failed to save offline sync queue', e);
    }
  }

  handleNetworkChange(online) {
    this.isOnline = online;
    this.notify();
    if (online) {
      this.flushQueue();
    }
  }

  async enqueue(action, payload) {
    const queue = this.getQueue();
    const newItem = {
      id: 'sync_' + Date.now() + '_' + Math.random().toString(36.substring(2, 9)),
      action,
      payload,
      timestamp: Date.now(),
      attempts: 0,
    };
    queue.push(newItem);
    this.saveQueue(queue);

    if (this.isOnline) {
      this.flushQueue();
    }
    return newItem.id;
  }

  async flushQueue() {
    if (this.syncInProgress || !this.isOnline) return;
    const queue = this.getQueue();
    if (queue.length === 0) return;

    this.syncInProgress = true;
    this.notify();

    const remainingQueue = [];

    for (const item of queue) {
      try {
        // Simulate network API call dispatch based on action type
        await new Promise((resolve, reject) => {
          setTimeout(() => {
            if (Math.random() < 0.05) {
              reject(new Error('Simulated network jitter/failure'));
            } else {
              resolve(true);
            }
          }, 400);
        });
        // Success: do not add back to remainingQueue
      } catch (err) {
        item.attempts = (item.attempts || 0) + 1;
        if (item.attempts < 5) {
          remainingQueue.push(item);
        } else {
          console.error('Sync item dropped after max retries:', item);
        }
      }
    }

    this.syncInProgress = false;
    this.saveQueue(remainingQueue);
  }

  async forceSync() {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline.');
    }
    await this.flushQueue();
  }
}

export const syncQueueService = new OfflineSyncQueueService();

// --- REACT CONTEXT & PROVIDER ---
const OfflineSyncContext = createContext(null);

export function OfflineSyncProvider({ children }) {
  const [state, setState] = useState(() => syncQueueService.getState());

  useEffect(() => {
    return syncQueueService.subscribe(setState);
  }, []);

  const enqueueMutation = (action, payload) => syncQueueService.enqueue(action, payload);
  const syncNow = () => syncQueueService.forceSync();

  return (
    <OfflineSyncContext.Provider value={{ ...state, enqueueMutation, syncNow }}>
      {children}
    </OfflineSyncContext.Provider>
  );
}

export function useOfflineSync() {
  const context = useContext(OfflineSyncContext);
  if (!context) {
    throw new Error('useOfflineSync must be used within an OfflineSyncProvider');
  }
  return context;
}

// --- NETWORK STATUS BADGE UI COMPONENT ---
export function NetworkStatusBadge() {
  const { isOnline, queue, syncInProgress, syncNow } = useOfflineSync();
  const queueCount = queue.length;

  return (
    <div className="flex items-center space-x-2 min-w-0">
      <div 
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border transition-all min-w-0 ${
          !isOnline 
            ? 'bg-amber-50 text-amber-800 border-amber-200 shadow-sm' 
            : syncInProgress 
              ? 'bg-blue-50 text-blue-800 border-blue-200 animate-pulse' 
              : queueCount > 0 
                ? 'bg-purple-50 text-purple-800 border-purple-200' 
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}
      >
        <span className={`w-2 h-2 rounded-full mr-1.5 shrink-0 ${
          !isOnline ? 'bg-amber-500' : syncInProgress ? 'bg-blue-500' : queueCount > 0 ? 'bg-purple-500' : 'bg-emerald-500'
        }`} />
        <span className="truncate">
          {!isOnline 
            ? `Offline (${queueCount} queued)` 
            : syncInProgress 
              ? 'Syncing changes...' 
              : queueCount > 0 
                ? `Syncing (${queueCount})` 
                : 'Online & Synced'}
        </span>
        {queueCount > 0 && isOnline && !syncInProgress && (
          <button
            onClick={() => syncNow().catch(err => alert(err.message))}
            className="ml-2 underline hover:text-purple-900 font-bold uppercase text-[10px]"
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
    console.error('SyncManager Error Boundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 max-w-xl mx-auto my-4">
          <h3 className="text-sm font-bold uppercase tracking-wide">Sync Manager Encountered an Error</h3>
          <p className="text-xs mt-1 text-red-600">{this.state.error?.message || 'Unknown persistence error.'}</p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            className="mt-3 px-3 py-1 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700"
          >
            Reload Sync Engine
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
