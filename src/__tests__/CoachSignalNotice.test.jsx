import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
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
  await screen.findAllByText('Coach guidance');
  expect(screen.getByText('Running, 25 min')).toBeTruthy();
  fireEvent.click(screen.getAllByRole('button', { name: 'Manage guidance' })[0]);
  fireEvent.click(screen.getByRole('checkbox', { name: /No running this week/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Clear selected guidance (1)' }));
  await waitFor(() => expect(screen.queryAllByText('Coach guidance')).toHaveLength(0));
  expect(screen.getByRole('status').textContent).toContain('Guidance cleared');
  expect(screen.getByText('Running, 25 min')).toBeTruthy();
});

it('shows failed save honestly and does not clear guidance', async () => {
  invoke.mockImplementation(async (_name, body) => {
    if (body.action === 'resolve') throw new Error('offline');
    return { data: { revision: 'revision', messages: [message] } };
  });
  render(wrap(<CoachSignalNotice athleteId="a" />));
  fireEvent.click(await screen.findByRole('button', { name: 'Manage guidance' }));
  fireEvent.click(screen.getByRole('checkbox', { name: /No running this week/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Clear selected guidance (1)' }));
  await screen.findByText(/Guidance could not be cleared/);
  expect(screen.queryByText(/Guidance cleared/)).toBeNull();
  expect(screen.getByText('Coach guidance')).toBeTruthy();
});

it('does not carry expanded review state to a different athlete', async () => {
  invoke.mockResolvedValue({ data: { revision: 'revision', messages: [message] } });
  const view = render(wrap(<CoachSignalNotice athleteId="a" />));
  fireEvent.click(await screen.findByRole('button', { name: 'Manage guidance' }));
  expect(screen.getByRole('button', { name: 'Clear selected guidance (0)' }).disabled).toBe(true);
  view.rerender(wrap(<CoachSignalNotice athleteId="b" />));
  await screen.findByRole('button', { name: 'Manage guidance' });
  expect(screen.queryByRole('button', { name: /Clear selected guidance/ })).toBeNull();
});

it('clears only checked notices and keeps unselected guidance available', async () => {
  const other = { ...message, id: 'other', content_text: 'My calf is sore and I should avoid running.', review_key: 'other-source' };
  const reviewed = new Set();
  invoke.mockImplementation(async (_name, body) => {
    if (body.action === 'resolve') {
      expect(body.source_keys).toEqual(['source']);
      body.source_keys.forEach(key => reviewed.add(key));
      return { data: { success: true } };
    }
    return { data: { revision: 'revision', messages: [message, other].filter(entry => !reviewed.has(entry.review_key)) } };
  });
  render(wrap(<CoachSignalNotice athleteId="a" />));
  fireEvent.click(await screen.findByRole('button', { name: 'Manage guidance' }));
  expect(screen.getByRole('button', { name: 'Clear selected guidance (0)' }).disabled).toBe(true);
  fireEvent.click(screen.getByRole('checkbox', { name: /No running this week/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Clear selected guidance (1)' }));
  await screen.findByText('1 note cleared. Remaining guidance is shown below.');
  fireEvent.click(screen.getByRole('button', { name: 'Manage guidance' }));
  expect(screen.queryByRole('checkbox', { name: /No running this week/ })).toBeNull();
  expect(screen.getByRole('checkbox', { name: /calf is sore/ }).checked).toBe(false);
});

it('selects/deselects the displayed notes and keeps guidance without writing', async () => {
  const other = { ...message, id: 'other', content_text: 'My calf is sore.', review_key: 'other-source' };
  invoke.mockResolvedValue({ data: { revision: 'revision', messages: [message, other] } });
  render(wrap(<CoachSignalNotice athleteId="a" />));
  fireEvent.click(await screen.findByRole('button', { name: 'Manage guidance' }));
  fireEvent.click(screen.getByRole('button', { name: 'Select all shown' }));
  expect(screen.getByRole('button', { name: 'Clear selected guidance (2)' }).disabled).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Deselect all shown' }));
  expect(screen.getByRole('button', { name: 'Clear selected guidance (0)' }).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Keep guidance' }));
  expect(screen.queryByRole('checkbox')).toBeNull();
  expect(invoke.mock.calls.every(([, body]) => body.action === 'read')).toBe(true);
});

it('does not clear a new source using the selection of an edited message', async () => {
  let current = message;
  invoke.mockImplementation(async () => ({ data: { revision: current.review_key, messages: [current] } }));
  render(wrap(<CoachSignalNotice athleteId="a" />));
  fireEvent.click(await screen.findByRole('button', { name: 'Manage guidance' }));
  fireEvent.click(screen.getByRole('checkbox', { name: /No running this week/ }));
  current = { ...message, content_text: 'My calf is sore.', review_key: 'new-source' };
  await act(async () => { await client.invalidateQueries({ queryKey: ['coach-signal'] }); });
  expect((await screen.findByRole('checkbox', { name: /calf is sore/ })).checked).toBe(false);
  expect(screen.getByRole('button', { name: 'Clear selected guidance (0)' }).disabled).toBe(true);
  expect(invoke.mock.calls.every(([, body]) => body.action === 'read')).toBe(true);
});

it('requires a confirmed save response before clearing any notice', async () => {
  invoke.mockImplementation(async (_name, body) => body.action === 'resolve'
    ? { data: { success: false } }
    : { data: { revision: 'revision', messages: [message] } });
  render(wrap(<CoachSignalNotice athleteId="a" />));
  fireEvent.click(await screen.findByRole('button', { name: 'Manage guidance' }));
  fireEvent.click(screen.getByRole('checkbox', { name: /No running this week/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Clear selected guidance (1)' }));
  await screen.findByRole('alert');
  expect(screen.getByRole('checkbox', { name: /No running this week/ }).checked).toBe(true);
  expect(screen.queryByText('Guidance cleared')).toBeNull();
});


it('offers a stable Settings entry even when no guidance is active', async () => {
  invoke.mockResolvedValue({ data: { revision: 'revision', messages: [] } });
  render(wrap(<CoachSignalNotice athleteId="a" showEmpty />));
  await screen.findByText('No active conversation notices. Your workouts remain available.');
  expect(screen.getByRole('link', { name: 'Open coach conversation' }).getAttribute('href')).toBe('/coach');
  expect(screen.queryByRole('button', { name: /Clear selected/ })).toBeNull();
  expect(invoke.mock.calls.every(([, body]) => body.action === 'read')).toBe(true);
});
