import { EventEmitter } from 'eventemitter3';

export interface SyncItem {
  id: string;
  action: string;
  payload: any;
  attempts?: number;
  lastAttempt?: number;
  lastError?: string;
  createdAt: number;
  nextRetryAt?: number;
}

class OfflineSyncQueueService extends EventEmitter {
  private queue: SyncItem[] = [];
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private handlers: Map<string, (payload: any, item: SyncItem) => Promise<void>> = new Map();
  private MAX_ATTEMPTS = 6;
  private BASE_DELAY = 1000;
  private MAX_DELAY = 30000;

  constructor() {
    super();
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.emit('status', { isOnline: true });
      this.processQueue();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.emit('status', { isOnline: false });
    });
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem('trainpace_offline_queue');
      if (saved) {
        this.queue = JSON.parse(saved);
      }
    } catch (e) {
      console.error('[offlineSyncQueue] failed to load from storage:', e);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('trainpace_offline_queue', JSON.stringify(this.queue));
    } catch (e) {
      console.error('[offlineSyncQueue] failed to save to storage:', e);
    }
  }

  public registerHandler(action: string, handler: (payload: any, item: SyncItem) => Promise<void>) {
    this.handlers.set(action, handler);
  }

  public enqueue(action: string, payload: any): string {
    const item: SyncItem = {
      id: 'sync_' + Math.random().toString(36).substring(2, 9),
      action,
      payload,
      attempts: 0,
      createdAt: Date.now(),
    };
    this.queue.push(item);
    this.saveToStorage();
    this.emit('update', { queue: this.queue });
    this.emit('status', this.getStatus());

    if (this.isOnline) {
      this.processQueue();
    }
    return item.id;
  }

  public getQueue(): SyncItem[] {
    return [...this.queue];
  }

  public getStatus() {
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      pendingCount: this.queue.length,
    };
  }

  public async processQueue() {
    if (this.syncInProgress || !this.isOnline || this.queue.length === 0) return;

    this.syncInProgress = true;
    this.emit('status', this.getStatus());

    const now = Date.now();
    const workQueue = [...this.queue];

    for (const item of workQueue) {
      // clear() may have cancelled waiting work while an earlier save was pending.
      if (!this.queue.includes(item)) continue;
      const handler = this.handlers.get(item.action);
      // Unregistered actions are pending work, never simulated successes.
      if (!handler) continue;
      const attempts = item.attempts || 0;
      if (item.nextRetryAt && now < item.nextRetryAt) {
        continue;
      }

      try {
        await handler(item.payload, item);
        this.queue = this.queue.filter((pending) => pending !== item);
      } catch (err: any) {
        const newAttempts = attempts + 1;
        item.attempts = newAttempts;
        item.lastAttempt = Date.now();
        item.lastError = err?.message || String(err);
        
        if (newAttempts < this.MAX_ATTEMPTS) {
          const backoff = Math.min(this.MAX_DELAY, this.BASE_DELAY * Math.pow(2, newAttempts - 1));
          item.nextRetryAt = Date.now() + backoff;
        } else {
          this.queue = this.queue.filter((pending) => pending !== item);
          console.error(`[offlineSyncQueue] Item ${item.id} dropped after max retries (${this.MAX_ATTEMPTS}):`, item);
        }
      }
      this.saveToStorage();
    }

    this.syncInProgress = false;
    this.saveToStorage();
    this.emit('update', { queue: this.queue });
    this.emit('status', this.getStatus());

    // enqueue() cannot start another processor while a save is in flight.
    // Drain new work now, without immediately retrying failures from this batch.
    if (this.queue.some((item) => !workQueue.includes(item))) {
      await this.processQueue();
    }
  }

  public clear() {
    this.queue = [];
    this.saveToStorage();
    this.emit('update', { queue: this.queue });
    this.emit('status', this.getStatus());
  }
}

export const offlineSyncQueue = new OfflineSyncQueueService();
export default offlineSyncQueue;
