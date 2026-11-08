import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  create: vi.fn().mockResolvedValue({ id: 'synthetic-profile', first_name: 'Synthetic' }),
  filter: vi.fn().mockResolvedValue([]),
  updateMe: vi.fn().mockResolvedValue({}),
  track: vi.fn(),
}));
vi.mock('@/api/base44Client', () => ({ base44: {
  entities: { AthleteProfile: { create: api.create, filter: api.filter } },
  auth: { updateMe: api.updateMe },
  analytics: { track: api.track },
} }));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ user: { id: 'synthetic-user' } }) }));

import OnboardingFlow from '@/components/dashboard/OnboardingFlow';

describe('Onboarding confirmation', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('allows device selection before an explicit profile-creation confirmation', async () => {
    const onCreated = vi.fn();
    render(<OnboardingFlow onCreated={onCreated} />);
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Synthetic' } });
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Athlete' } });
    fireEvent.change(screen.getByLabelText('…or just your age'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: "I'm new, no race yet" }));
    fireEvent.change(screen.getByPlaceholderText('e.g. 25'), { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Step 3 of 3')).toBeTruthy();
    expect(api.create).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /COROS/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Create my profile' }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(api.create.mock.calls[0][0].primary_wearables).toEqual(['coros']);
  });
});
