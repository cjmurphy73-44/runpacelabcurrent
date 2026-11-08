import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  access: {},
  listAssignments: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ user: { id: 'synthetic-athlete', role: 'user' } }) }));
vi.mock('@/hooks/useCoachAccess', () => ({ useCoachAccess: () => state.access }));
vi.mock('@/api/base44Client', () => ({ base44: { entities: { CoachAthleteAssignment: { filter: state.listAssignments } } } }));

import CoachWorkspace from '@/pages/CoachWorkspace';

describe('Coach workspace access', () => {
  beforeEach(() => {
    state.access = { plan: 'free', loading: false, canUseCoachWorkspace: false };
    state.listAssignments.mockClear();
  });

  it('shows the coach-plan gate without fetching roster data for an athlete', () => {
    render(<MemoryRouter><CoachWorkspace /></MemoryRouter>);
    expect(screen.getByText('The Coach Workspace is a Coach Pro feature')).toBeTruthy();
    expect(state.listAssignments).not.toHaveBeenCalled();
  });

  it('waits for access resolution without fetching roster data', () => {
    Object.assign(state.access, { loading: true, canUseCoachWorkspace: true });
    render(<MemoryRouter><CoachWorkspace /></MemoryRouter>);
    expect(screen.getByRole('status').textContent).toContain('Checking coach access');
    expect(state.listAssignments).not.toHaveBeenCalled();
  });
});
