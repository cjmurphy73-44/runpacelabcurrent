import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/api/base44Client', () => ({ base44: { functions: { invoke } } }));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }));
import CoachSignalNotice from '@/components/dashboard/CoachSignalNotice';

let client;
beforeEach(() => { client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); invoke.mockReset(); });
afterEach(() => { cleanup(); client.clear(); });
const wrap = children => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
const message = { id: 'message', content_text: 'No running this week.', created_date: new Date().toISOString(), review_key: 'source' };

it('keeps the saved workout visible and updates two consumers after a persisted review', async () => {
  let resolved = false;
  invoke.mockImplementation(async (_name, body) => {
    if (body.action === 'resolve') { expect(body.source_keys).toEqual(['source']); resolved = true; return { data: { success: true } }; }
    return { data: { revision: 'revision', messages: resolved ? [] : [message] } };
  });
  render(wrap(<><p>Running, 25 min</p><CoachSignalNotice athleteId="a" /><CoachSignalNotice athleteId="a" /></>));
  await screen.findAllByText('Review recovery guidance');
  expect(screen.getByText('Running, 25 min')).toBeTruthy();
  fireEvent.click(screen.getAllByRole('button', { name: 'Review guidance' })[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Mark no longer relevant' }));
  await waitFor(() => expect(screen.queryAllByText('Review recovery guidance')).toHaveLength(0));
  expect(screen.getByRole('status').textContent).toContain('Review saved');
  expect(screen.getByText('Running, 25 min')).toBeTruthy();
});

it('shows failed save honestly and does not clear guidance', async () => {
  invoke.mockImplementation(async (_name, body) => {
    if (body.action === 'resolve') throw new Error('offline');
    return { data: { revision: 'revision', messages: [message] } };
  });
  render(wrap(<CoachSignalNotice athleteId="a" />));
  fireEvent.click(await screen.findByRole('button', { name: 'Review guidance' }));
  fireEvent.click(screen.getByRole('button', { name: 'Mark no longer relevant' }));
  await screen.findByText(/Review could not be saved/);
  expect(screen.queryByText(/Review saved/)).toBeNull();
  expect(screen.getByText('Review recovery guidance')).toBeTruthy();
});

it('does not carry expanded review state to a different athlete', async () => {
  invoke.mockResolvedValue({ data: { revision: 'revision', messages: [message] } });
  const view = render(wrap(<CoachSignalNotice athleteId="a" />));
  fireEvent.click(await screen.findByRole('button', { name: 'Review guidance' }));
  expect(screen.getByRole('button', { name: 'Mark no longer relevant' })).toBeTruthy();
  view.rerender(wrap(<CoachSignalNotice athleteId="b" />));
  await screen.findByRole('button', { name: 'Review guidance' });
  expect(screen.queryByRole('button', { name: 'Mark no longer relevant' })).toBeNull();
});
