// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  me: vi.fn(),
  athleteGet: vi.fn(),
  athleteFilter: vi.fn(),
  planFilter: vi.fn(),
}));

vi.mock('@/api/base44Client', () => ({
  base44: {
    auth: { me: mocks.me },
    entities: {
      AthleteProfile: { get: mocks.athleteGet, filter: mocks.athleteFilter },
      TrainingPlan: { filter: mocks.planFilter },
    },
  },
}));
vi.mock('@/hooks/useCoachInjurySignal', () => ({
  useCoachInjurySignal: () => ({ holdReason: false, summary: '', loading: false }),
}));
vi.mock('@/components/dashboard/OnboardingFlow', () => ({
  default: () => <div>Profile setup</div>,
}));
vi.mock('@/components/trainingplan/TrainingPlanGenerator', () => ({
  default: () => <div>Generate a training plan</div>,
}));
vi.mock('@/components/trainingplan/TrainingPlanTimeline', () => ({
  default: () => <div>Existing training plan</div>,
}));
vi.mock('@/components/trainingplan/TrainingPlanWeeklyBreakdown', () => ({
  default: () => null,
}));
vi.mock('@/components/trainingplan/TrainingPlanExtras', () => ({
  default: () => null,
}));
vi.mock('@/components/guide/HelpLink', () => ({
  default: () => null,
}));

import TrainingPlan from '../TrainingPlan';

describe('Training plan loading and recovery', () => {
  beforeEach(() => {
    mocks.me.mockReset().mockResolvedValue({ id: 'user-1', data: { athlete_profile_id: 'athlete-1' } });
    mocks.athleteGet.mockReset().mockResolvedValue({ id: 'athlete-1' });
    mocks.athleteFilter.mockReset().mockResolvedValue([]);
    mocks.planFilter.mockReset().mockImplementation(({ status }) =>
      Promise.resolve(status === 'active' ? [{ id: 'plan-1', status: 'active' }] : [])
    );
  });
  afterEach(cleanup);

  it('shows the existing plan when both plan queries succeed', async () => {
    render(<TrainingPlan />);
    expect(await screen.findByText('Existing training plan')).toBeTruthy();
    expect(screen.queryByText('Generate a training plan')).toBeNull();
  });

  it.each(['draft', 'active'])('does not offer plan generation when the %s query fails', async (failedStatus) => {
    mocks.planFilter.mockImplementation(({ status }) =>
      status === failedStatus
        ? Promise.reject(new Error('Network unavailable'))
        : Promise.resolve([])
    );
    render(<TrainingPlan />);
    expect(await screen.findByText("Couldn't load your training plan")).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
    expect(screen.queryByText('Generate a training plan')).toBeNull();
    expect(screen.queryByText('Profile setup')).toBeNull();
  });

  it('recovers the existing plan after a failed query and Retry', async () => {
    let failOnce = true;
    mocks.planFilter.mockImplementation(({ status }) => {
      if (status === 'active' && failOnce) {
        failOnce = false;
        return Promise.reject(new Error('Temporary network issue'));
      }
      return Promise.resolve(status === 'active' ? [{ id: 'plan-1', status: 'active' }] : []);
    });
    render(<TrainingPlan />);
    expect(await screen.findByText("Couldn't load your training plan")).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByText('Existing training plan')).toBeTruthy());
    expect(screen.queryByText('Generate a training plan')).toBeNull();
  });

  it('shows plan creation only after both queries confirm no plans', async () => {
    mocks.planFilter.mockResolvedValue([]);
    render(<TrainingPlan />);
    expect(await screen.findByText('Generate a training plan')).toBeTruthy();
    expect(screen.queryByText("Couldn't load your training plan")).toBeNull();
  });
});
