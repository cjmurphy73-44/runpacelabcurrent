// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({
  sessions: vi.fn(),
  plans: vi.fn(),
  injury: { level: 'none', loading: false, evidence: [], summary: null },
}));

vi.mock('@/api/base44Client', () => ({
  base44: { entities: {
    TrainingPlanSession: { filter: mocks.sessions },
    TrainingPlan: { filter: mocks.plans },
  } },
}));
vi.mock('@/context/FitnessContext', () => ({ useFitness: () => ({ biometricTelemetry: [] }) }));
vi.mock('@/hooks/useCoachInjurySignal', () => ({ useCoachInjurySignal: () => mocks.injury }));
vi.mock('@/components/ui/ZoneBadge', () => ({ default: () => null }));

import TodaySessionCard from '../TodaySessionCard';

const mount = (athleteId = 'athlete-1') => render(
  <MemoryRouter><TodaySessionCard athleteId={athleteId} /></MemoryRouter>
);

describe("Today's Session dashboard card", () => {
  beforeEach(() => {
    mocks.sessions.mockReset().mockResolvedValue([]);
    mocks.plans.mockReset().mockResolvedValue([]);
  });
  afterEach(cleanup);

  it('shows an honest no-plan state and a working route to the training plan', async () => {
    mount();
    expect(await screen.findByText('No active training plan')).toBeTruthy();
    expect(screen.getByRole('link', { name: /training plan/i }).getAttribute('href')).toBe('/plan');
    expect(screen.queryByText('Rest Day')).toBeNull();
  });

  it('distinguishes a free day on an active plan from a missing plan', async () => {
    mocks.plans.mockResolvedValue([{ id: 'plan-1' }]);
    mount();
    expect(await screen.findByText('No workout scheduled')).toBeTruthy();
    expect(screen.queryByText('No active training plan')).toBeNull();
  });

  it('renders the prescribed session without claiming normal readiness when HRV is missing', async () => {
    mocks.sessions.mockResolvedValue([{
      sport: 'running', prescribed_duration_minutes: 45, prescribed_intensity_zone: 'Z2',
    }]);
    mount();
    expect(await screen.findByText('45 min')).toBeTruthy();
    expect(screen.getByText(/HRV readiness not assessed/i)).toBeTruthy();
    expect(screen.queryByText(/Readiness normal/i)).toBeNull();
  });

  it('shows an error instead of a false rest day and retries successfully', async () => {
    mocks.sessions.mockRejectedValueOnce(new Error('network offline')).mockResolvedValue([]);
    mount();
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText(/Your schedule hasn't been changed/i)).toBeTruthy();
    expect(screen.queryByText('No active training plan')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /retry loading/i }));
    await waitFor(() => expect(mocks.sessions).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('No active training plan')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('ignores a stale response after switching athlete profiles', async () => {
    let resolveOld;
    mocks.sessions.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    const view = mount('athlete-old');
    view.rerender(<MemoryRouter><TodaySessionCard athleteId="athlete-new" /></MemoryRouter>);
    await screen.findByText('No active training plan');
    resolveOld([{ sport: 'cycling', prescribed_duration_minutes: 90 }]);
    await waitFor(() => expect(screen.queryByText('90 min')).toBeNull());
  });
});
