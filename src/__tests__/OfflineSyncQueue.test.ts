import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import queue from '@/services/offlineSyncQueue';
import { NetworkStatusBadge, OfflineSyncProvider } from '@/components/layout/offlineSyncAdapters';

const stored = () => JSON.parse(localStorage.getItem('trainpace_offline_queue') || '[]');
const deferred = () => {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const online = () => window.dispatchEvent(new Event('online'));
const offline = () => window.dispatchEvent(new Event('offline'));
beforeEach(() => { offline(); queue.clear(); });
afterEach(() => { cleanup(); offline(); queue.clear(); vi.restoreAllMocks(); });

async function exhaustRetries(action: string, payload = { synthetic: true }) {
  let clock = 10000;
  vi.spyOn(Date, 'now').mockImplementation(() => clock);
  const handler = vi.fn().mockRejectedValue(new Error('Temporary failure'));
  queue.registerHandler(action, handler);
  const id = queue.enqueue(action, payload);
  online();
  await waitFor(() => expect(queue.getStatus().syncInProgress).toBe(false));
  for (let attempt = 1; attempt < 6; attempt++) {
    clock += 30000;
    await queue.processQueue();
  }
  return { handler, id };
}

it('retains exhausted changes and does not log their payload or retry on reconnect', async () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  const { handler, id } = await exhaustRetries('exhausted');
  expect(handler).toHaveBeenCalledTimes(6);
  expect(stored()).toEqual([expect.objectContaining({ id, attempts: 6, payload: { synthetic: true } })]);
  expect(queue.getStatus()).toMatchObject({ pendingCount: 1, failedCount: 1 });
  offline();
  online();
  await queue.processQueue();
  expect(handler).toHaveBeenCalledTimes(6);
  expect(log).not.toHaveBeenCalled();
});

it('keeps failed work intact when retry is requested offline', async () => {
  const { handler } = await exhaustRetries('offline-retry');
  offline();
  await queue.retryFailed();
  expect(handler).toHaveBeenCalledTimes(6);
  expect(stored()[0].attempts).toBe(6);
});

it('shows unsaved failures and recovers them through the explicit retry control', async () => {
  const { handler } = await exhaustRetries('ui-retry');
  handler.mockResolvedValue(undefined);
  render(createElement(OfflineSyncProvider, null, createElement(NetworkStatusBadge)));
  expect(screen.getByRole('status').textContent).toContain('Sync failed (1); 1 unsaved');
  fireEvent.click(screen.getByRole('button', { name: 'Retry failed changes' }));
  await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Online'));
  expect(handler).toHaveBeenCalledTimes(7);
  expect(stored()).toEqual([]);
  expect(queue.getStatus()).toMatchObject({ pendingCount: 0, failedCount: 0 });
});

it('persists in-flight and newly queued work until each save actually completes', async () => {
  const first = deferred();
  const second = deferred();
  const handler = vi.fn().mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);
  queue.registerHandler('save', handler);
  const a = queue.enqueue('save', { value: 'first' });
  online();
  expect(handler).toHaveBeenCalledTimes(1);
  const b = queue.enqueue('save', { value: 'second' });
  expect(stored().map((item: { id: string }) => item.id)).toEqual([a, b]);
  expect(queue.getStatus().pendingCount).toBe(2);
  first.resolve();
  await waitFor(() => expect(handler).toHaveBeenCalledTimes(2));
  expect(stored().map((item: { id: string }) => item.id)).toEqual([b]);
  second.resolve();
  await waitFor(() => expect(queue.getStatus().syncInProgress).toBe(false));
  expect(stored()).toEqual([]);
});

it('retains a failed save alongside work queued during that request', async () => {
  const save = deferred();
  queue.registerHandler('failure', () => save.promise);
  const failed = queue.enqueue('failure', {});
  online();
  const pending = queue.enqueue('unregistered', {});
  save.reject(new Error('Connection interrupted'));
  await waitFor(() => expect(queue.getStatus().syncInProgress).toBe(false));
  expect(stored().map((item: { id: string }) => item.id)).toEqual([failed, pending]);
  expect(queue.getQueue()[0]).toMatchObject({ attempts: 1, lastError: 'Connection interrupted' });
});

it('does not report unregistered actions as successfully saved', async () => {
  const id = queue.enqueue('no-handler', { synthetic: true });
  online();
  await queue.processQueue();
  expect(queue.getQueue()).toEqual([expect.objectContaining({ id, attempts: 0 })]);
  expect(stored()).toEqual([expect.objectContaining({ id })]);
});

it('clearing during an in-flight save cancels waiting work without restoring failed work', async () => {
  const save = deferred();
  const handler = vi.fn().mockImplementationOnce(() => save.promise);
  queue.registerHandler('clear-test', handler);
  queue.enqueue('clear-test', { order: 1 });
  queue.enqueue('clear-test', { order: 2 });
  online();
  queue.clear();
  save.reject(new Error('Request failed after clear'));
  await waitFor(() => expect(queue.getStatus().syncInProgress).toBe(false));
  expect(handler).toHaveBeenCalledTimes(1);
  expect(queue.getQueue()).toEqual([]);
  expect(stored()).toEqual([]);
});

it('notifies the UI immediately when an offline change is queued', () => {
  const onStatus = vi.fn();
  queue.on('status', onStatus);
  try {
    queue.enqueue('pending-ui', {});
    expect(onStatus).toHaveBeenLastCalledWith(expect.objectContaining({ isOnline: false, pendingCount: 1 }));
  } finally {
    queue.off('status', onStatus);
  }
});

it('keeps backoff work pending and allows an explicit retry when it is due', async () => {
  let clock = 10000;
  vi.spyOn(Date, 'now').mockImplementation(() => clock);
  const handler = vi.fn().mockRejectedValueOnce(new Error('temporary failure')).mockResolvedValue(undefined);
  queue.registerHandler('retry-test', handler);
  queue.enqueue('retry-test', {});
  online();
  await waitFor(() => expect(queue.getStatus().syncInProgress).toBe(false));
  await queue.retryFailed();
  expect(handler).toHaveBeenCalledTimes(1);
  expect(stored()).toHaveLength(1);
  clock += 1000;
  await queue.processQueue();
  expect(handler).toHaveBeenCalledTimes(2);
  expect(stored()).toEqual([]);
});
