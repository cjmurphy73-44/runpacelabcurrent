import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import moment from 'moment';
const { filter, plans, invoke } = vi.hoisted(() => ({ filter: vi.fn(), plans: vi.fn(), invoke: vi.fn() }));
vi.mock('@/api/base44Client', () => ({ base44: { entities: { TrainingPlanSession: { filter }, TrainingPlan: { filter: plans } }, functions: { invoke } } }));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }));
vi.mock('@/context/FitnessContext', () => ({ useFitness: () => ({ biometricTelemetry: [] }) }));
vi.mock('@/components/dashboard/CoachSignalNotice', () => ({ default: () => null }));
vi.mock('@/hooks/useSubscription', () => ({ useSubscription: () => ({ plan: 'pro' }) }));
vi.mock('@/components/billing/FeatureGate', () => ({ default: ({ children }) => children }));
vi.mock('@/services/workoutExport', () => ({ downloadWorkoutFile: vi.fn() }));
import TodaySessionCard from '@/components/dashboard/TodaySessionCard';
import TrainingCalendar from '@/components/dashboard/TrainingCalendar';

let client;
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  filter.mockReset(); plans.mockReset(); invoke.mockReset(); plans.mockResolvedValue([]);
});
afterEach(() => { cleanup(); client.clear(); });
const wrap = children => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
const workout = () => ({ id: 'session', sport: 'running', prescribed_duration_minutes: 25, date: moment().format('YYYY-MM-DD'), status: 'pending' });

it('renders an actual running session without the removed injury variable or invented readiness', async () => {
  filter.mockResolvedValue([workout()]);
  render(wrap(<TodaySessionCard athleteId="a" />));
  await screen.findByRole('heading', { name: 'running' });
  expect(screen.getByText('25 min')).toBeTruthy();
  expect(screen.queryByText(/Readiness normal/)).toBeNull();
});

it('distinguishes a failed session load from rest and recovers through retry', async () => {
  filter.mockRejectedValueOnce(new Error('offline')).mockResolvedValue([workout()]);
  render(wrap(<TodaySessionCard athleteId="a" />));
  await screen.findByText("Could not refresh today's session");
  expect(screen.queryByText('Rest Day')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Retry session' }));
  await screen.findByText('25 min');
  expect(screen.queryByText("Could not refresh today's session")).toBeNull();
});

it('does not label unknown calendar days as rest after a fetch failure', async () => {
  filter.mockRejectedValueOnce(new Error('offline')).mockResolvedValue([workout()]);
  render(wrap(<TrainingCalendar athleteId="a" currentTsb={0} />));
  await screen.findByText('Could not refresh the calendar');
  expect(screen.queryAllByText('Rest day')).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Retry calendar' }));
  await screen.findByText('running');
});

it('failed AI adjustment keeps the saved workout visible and releases the busy button', async () => {
  filter.mockResolvedValue([workout()]); invoke.mockRejectedValue(new Error('timeout'));
  render(wrap(<TrainingCalendar athleteId="a" currentTsb={0} />));
  await screen.findByText('running');
  fireEvent.click(screen.getByRole('button', { name: 'AI Microadjustment' }));
  await screen.findByText('Adjustment could not be confirmed');
  await waitFor(() => expect(screen.getByRole('button', { name: 'AI Microadjustment' }).disabled).toBe(false));
  expect(screen.getByText('running')).toBeTruthy();
  expect(screen.queryByText(/Adjustment saved/)).toBeNull();
});

it('reports a successful no-op honestly', async () => {
  filter.mockResolvedValue([workout()]); invoke.mockResolvedValue({ data: { success: true, adjusted: [] } });
  render(wrap(<TrainingCalendar athleteId="a" currentTsb={0} />));
  await screen.findByText('running');
  fireEvent.click(screen.getByRole('button', { name: 'AI Microadjustment' }));
  await screen.findByText('No workout changes were applied.');
});

it('refreshes today and calendar together after a confirmed adjustment', async () => {
  let duration = 25;
  filter.mockImplementation(async () => [{ ...workout(), prescribed_duration_minutes: duration }]);
  invoke.mockImplementation(async () => { duration = 30; return { data: { success: true, adjusted: [{ id: 'session' }] } }; });
  render(wrap(<><TodaySessionCard athleteId="a" /><TrainingCalendar athleteId="a" currentTsb={0} /></>));
  await screen.findByText('25 min');
  fireEvent.click(screen.getByRole('button', { name: 'AI Microadjustment' }));
  await screen.findByText('30 min');
  await screen.findByText('30 min · -');
});

it('distinguishes a saved adjustment from a failed follow-up refresh', async () => {
  let failRefresh = false;
  filter.mockImplementation(async () => { if (failRefresh) throw new Error('offline'); return [workout()]; });
  invoke.mockImplementation(async () => { failRefresh = true; return { data: { success: true, adjusted: [{ id: 'session' }] } }; });
  render(wrap(<TrainingCalendar athleteId="a" currentTsb={0} />));
  await screen.findByText('running');
  fireEvent.click(screen.getByRole('button', { name: 'AI Microadjustment' }));
  await screen.findByText('Adjustment saved, but the schedule could not be refreshed.');
  expect(screen.getByText('running')).toBeTruthy();
  expect(screen.queryByText('Adjustment saved. Showing the refreshed schedule.')).toBeNull();
});

it('does not carry a failed in-flight adjustment into another athlete calendar', async () => {
  let rejectRequest;
  filter.mockImplementation(async query => [{ ...workout(), prescribed_duration_minutes: query.athlete_id === 'b' ? 15 : 25 }]);
  invoke.mockImplementation(() => new Promise((_resolve, reject) => { rejectRequest = reject; }));
  const view = render(wrap(<TrainingCalendar athleteId="a" currentTsb={0} />));
  await screen.findByText('25 min · -');
  fireEvent.click(screen.getByRole('button', { name: 'AI Microadjustment' }));
  await waitFor(() => expect(rejectRequest).toBeTruthy());
  view.rerender(wrap(<TrainingCalendar athleteId="b" currentTsb={0} />));
  await screen.findByText('15 min · -');
  rejectRequest(new Error('old athlete request failed'));
  await waitFor(() => expect(screen.getByRole('button', { name: 'AI Microadjustment' }).disabled).toBe(false));
  expect(screen.queryByText('Adjustment could not be confirmed')).toBeNull();
  expect(screen.queryByText('25 min · -')).toBeNull();
});
