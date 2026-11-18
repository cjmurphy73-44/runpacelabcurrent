// @vitest-environment happy-dom
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WorkoutReviewExperience from '../WorkoutReviewExperience';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="chart-container">{children}</div>,
  LineChart: ({ children }) => <div data-testid="chart">{children}</div>,
  Line: () => null, XAxis: () => null, YAxis: () => null,
  CartesianGrid: () => null, Tooltip: () => null,
}));
const stream = (n) => Array.from({ length: n }, (_, time) => ({ time, heart_rate: 125 + time % 20, speed: 3.4 }));
const workout = (streams) => ({
  date: '2026-11-15', sport: 'running', duration_minutes: 120, duration_seconds: 7200,
  distance_km: 21.4, avg_hr: 138, session_trimp: 90, load_source: 'stream', zone_method: 'average', streams,
});
const view = (w) => render(<MemoryRouter><WorkoutReviewExperience workout={w} /></MemoryRouter>);
describe('WorkoutReviewExperience', () => {
  it('switches measured HR to speed and reveals missing power without inventing data', () => {
    view(workout(stream(7201)));
    expect(screen.getByRole('img', { name: /heart rate measurements/i })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Speed' }));
    expect(screen.getByRole('img', { name: /speed measurements/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Speed' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Power' }));
    expect(screen.getByText(/no measured power channel/i)).toBeTruthy();
    cleanup();
  });
  it('shows partial coverage and an import action for a truncated recording', () => {
    view(workout(stream(3600)));
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('50');
    expect(screen.getByText(/partial measured recording/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /import an original fit/i }).getAttribute('href')).toBe('/import');
    cleanup();
  });
  it('withholds graphs for summary-only data', () => {
    view(workout([]));
    expect(screen.getByText(/no verified measured stream to chart/i)).toBeTruthy();
    expect(screen.queryByRole('img', { name: /measurements over/i })).toBeNull();
    cleanup();
  });
  it('does not claim FIT archival or measured zone distribution from average-only zones', () => {
    view(workout(stream(7201)));
    expect(screen.getByText(/original fit retention unverified/i)).toBeTruthy();
    expect(screen.getByText(/measured heart-rate zone distribution is unavailable/i)).toBeTruthy();
    cleanup();
  });
});
