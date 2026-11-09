import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { session } = vi.hoisted(() => ({ session: {} }));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => session }));

import Landing from '@/pages/Landing';
import { UIPreferencesProvider } from '@/context/UIPreferencesContext';

function renderEntry() {
  return render(
    <UIPreferencesProvider>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<h1>Athlete app entry</h1>} />
        </Routes>
      </MemoryRouter>
    </UIPreferencesProvider>
  );
}

describe('Landing entry', () => {
  beforeEach(() => {
    Object.assign(session, {
      user: null,
      isAuthenticated: false,
      authChecked: true,
      isLoadingAuth: false,
    });
  });

  it('takes an authenticated athlete directly to the app entry', async () => {
    Object.assign(session, { user: { id: 'synthetic-athlete' }, isAuthenticated: true });
    renderEntry();
    expect(await screen.findByRole('heading', { name: 'Athlete app entry' })).toBeTruthy();
    expect(screen.queryByText('Go to dashboard')).toBeNull();
  });

  it('waits for session resolution without flashing the marketing page', () => {
    session.authChecked = false;
    renderEntry();
    expect(screen.getByRole('status').textContent).toContain('Checking your session');
    expect(screen.queryByRole('heading', { name: 'Athlete app entry' })).toBeNull();
    expect(screen.queryByText('Get started free')).toBeNull();
  });

  it('keeps the public landing page available to signed-out visitors', () => {
    renderEntry();
    expect(screen.getAllByText('Get started free').length).toBeGreaterThan(0);
    expect(screen.queryByRole('heading', { name: 'Athlete app entry' })).toBeNull();
  });
});
