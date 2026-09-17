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
    const remainingQueue: SyncItem[] = [];
    const workQueue = [...this.queue];
    this.queue = [];

    for (const item of workQueue) {
      const attempts = item.attempts || 0;
      if (item.nextRetryAt && now < item.nextRetryAt) {
        remainingQueue.push(item);
        continue;
      }

      try {
        const handler = this.handlers.get(item.action);
        if (handler) {
          await handler(item.payload, item);
        } else {
          await new Promise((resolve, reject) => {
            setTimeout(() => {
              if (Math.random() < 0.03) {
                reject(new Error('Simulated network jitter/failure'));
              } else {
                resolve(true);
              }
            }, 350);
          });
        }
      } catch (err: any) {
        const newAttempts = attempts + 1;
        item.attempts = newAttempts;
        item.lastAttempt = Date.now();
        item.lastError = err?.message || String(err);
        
        if (newAttempts < this.MAX_ATTEMPTS) {
          const backoff = Math.min(this.MAX_DELAY, this.BASE_DELAY * Math.pow(2, newAttempts - 1));
          item.nextRetryAt = Date.now() + backoff;
          remainingQueue.push(item);
        } else {
          console.error(`[offlineSyncQueue] Item ${item.id} dropped after max retries (${this.MAX_ATTEMPTS}):`, item);
        }
      }
    }

    this.queue = remainingQueue;
    this.syncInProgress = false;
    this.saveToStorage();
    this.emit('update', { queue: this.queue });
    this.emit('status', this.getStatus());
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
