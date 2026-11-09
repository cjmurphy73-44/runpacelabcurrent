import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import UserGuide from '@/pages/UserGuide';
import ProviderExportCard from '@/components/guide/ProviderExportCard';

describe('User Guide', () => {
  it('renders provider instructions and metric explanations without crashing', () => {
    render(<MemoryRouter><UserGuide /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'User Guide' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'COROS' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Strava' })).toBeTruthy();
    expect(screen.getByText('Fitness / CTL')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Go to dashboard' }).getAttribute('href')).toBe('/app');
  });

  it('uses a safe availability label for an unknown provider status', () => {
    render(<ProviderExportCard provider={{ id: 'synthetic', name: 'Synthetic device', status: 'unknown' }} />);
    expect(screen.getByText('Check availability')).toBeTruthy();
  });
});
