import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const { invoke, auth } = vi.hoisted(() => ({ invoke: vi.fn(), auth: { user: { id: 'owner' } } }));
vi.mock('@/api/base44Client', () => ({ base44: { functions: { invoke } } }));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => auth }));
import Garmin from '@/components/settings/GarminConnectionCard';
import Coros from '@/components/settings/CorosIntegration';
import { providerSyncFeedback } from '@/lib/providerSyncFeedback';
const clients = [];
function mount(Card, athleteId = 'athlete') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clients.push(client);
  return render(<QueryClientProvider client={client}><Card athleteId={athleteId} /></QueryClientProvider>);
}
beforeEach(() => { invoke.mockReset(); auth.user = { id: 'owner' }; });
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); });

it.each([[Garmin, 'Garmin'], [Coros, 'COROS']])('keeps a failed status distinct from disconnected and supports retry (%s)', async (Card, name) => {
  invoke.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ data: { connected: true } });
  mount(Card);
  await screen.findByRole('alert');
  expect(screen.queryByRole('button', { name: new RegExp(`^Connect ${name}`) })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: `Retry ${name} status` }));
  await screen.findByText('Connected');
  expect(screen.queryByRole('alert')).toBeNull();
});

it.each([[Garmin, 'Garmin'], [Coros, 'COROS']])('offers reconnect instead of sync for expired authorization (%s)', async (Card, name) => {
  invoke.mockResolvedValue({ data: { connected: true, needs_reconnect: true } });
  mount(Card);
  await screen.findByRole('button', { name: `Reconnect ${name}` });
  expect(screen.queryByRole('button', { name: /Sync now|Sync workouts/ })).toBeNull();
});

it('blocks overlapping operations and labels an empty result without claiming up-to-date', async () => {
  let finish;
  invoke.mockImplementation((_, { action }) => action === 'status'
    ? Promise.resolve({ data: { connected: true } })
    : new Promise(resolve => { finish = resolve; }));
  mount(Garmin);
  fireEvent.click(await screen.findByRole('button', { name: 'Sync now' }));
  const disconnect = screen.getByRole('button', { name: 'Disconnect' });
  expect(disconnect.disabled).toBe(true);
  fireEvent.click(disconnect);
  expect(invoke).toHaveBeenCalledTimes(2);
  finish({ data: { success: true, imported: 0, recovery_imported: 0 } });
  await screen.findByText('No new workouts or recovery days were imported in this sync.');
  expect(screen.queryByText(/up to date/i)).toBeNull();
});

it('surfaces partial COROS recovery tool failures as an alert', async () => {
  invoke.mockImplementation((_, { action }) => Promise.resolve({ data: action === 'status'
    ? { connected: true }
    : { success: true, imported: 2, errors: 0, toolErrors: ['provider unavailable'] } }));
  mount(Coros);
  fireEvent.click(await screen.findByRole('button', { name: 'Sync recovery' }));
  const alert = await screen.findByRole('alert');
  expect(alert.textContent).toContain('2 recovery days imported');
  expect(alert.textContent).toContain('provider requests failed');
  expect(screen.queryByRole('status')).toBeNull();
});

it('does not reuse another athlete connection state while loading', async () => {
  invoke.mockResolvedValueOnce({ data: { connected: true } }).mockImplementation(() => new Promise(() => {}));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clients.push(client);
  const view = render(<QueryClientProvider client={client}><Garmin athleteId="one" /></QueryClientProvider>);
  await screen.findByText('Connected');
  view.rerender(<QueryClientProvider client={client}><Garmin athleteId="two" /></QueryClientProvider>);
  await waitFor(() => expect(screen.queryByText('Connected')).toBeNull());
  expect(screen.getByRole('button', { name: 'Connect Garmin' }).disabled).toBe(true);
});

it('rejects malformed sync payloads and preserves partial counts', () => {
  for (const data of [{ success: true }, { success: true, imported: -1 }, { success: true, imported: NaN }, { imported: 4 }, { success: true, imported: 0, toolErrors: 'failed' }]) {
    expect(() => providerSyncFeedback(data)).toThrow();
  }
  expect(providerSyncFeedback({ success: true, imported: 3, errors: 1 })).toContain('sync is incomplete');
  expect(providerSyncFeedback({ success: true, imported: 0, toolErrors: ['failed'] })).toContain('provider requests failed');
});

it.each([[Garmin, 'garminSync'], [Coros, 'corosSync']])('does not claim a rejected disconnect succeeded (%s)', async (Card, provider) => {
  const previousConfirm = window.confirm;
  window.confirm = vi.fn(() => true);
  invoke.mockImplementation((_, { action }) => Promise.resolve({ data: action === 'status' ? { connected: true } : { success: false, error: 'Disconnect rejected' } }));
  mount(Card);
  fireEvent.click(await screen.findByRole('button', { name: 'Disconnect' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Disconnect rejected');
  expect(screen.getByText('Connected')).toBeTruthy();
  expect(invoke).toHaveBeenCalledWith(provider, { action: 'disconnect' });
  window.confirm = previousConfirm;
});

it('treats a malformed status payload as unknown rather than disconnected', async () => {
  invoke.mockResolvedValue({ data: { connected: false, error: 'Provider unavailable' } });
  mount(Garmin);
  await screen.findByRole('button', { name: 'Retry Garmin status' });
  expect(screen.queryByText('Not connected')).toBeNull();
});
