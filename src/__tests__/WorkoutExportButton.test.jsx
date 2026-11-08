import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const { download } = vi.hoisted(() => ({ download: vi.fn() }));
vi.mock('@/services/workoutExport', () => ({ downloadWorkoutFile: download }));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }));
import WorkoutExportButton from '@/components/workout/WorkoutExportButton';
beforeEach(() => { download.mockReset(); });
afterEach(cleanup);

it('prevents duplicate exports while preparing and never claims a file was saved', async () => {
  let complete;
  download.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  render(<WorkoutExportButton session={{ id: 'one' }} />);
  const button = screen.getByRole('button', { name: 'Export workout JSON' });
  fireEvent.click(button); fireEvent.click(button);
  expect(download).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Preparing export...' }).disabled).toBe(true);
  complete();
  await screen.findByText('Download requested. Check your browser downloads.');
  expect(screen.queryByText(/saved successfully/i)).toBeNull();
  expect(screen.getByText(/Direct watch import is not verified/)).toBeTruthy();
});

it('shows a failed download with retry and recovers', async () => {
  download.mockRejectedValueOnce(new Error('blocked')).mockResolvedValue(undefined);
  render(<WorkoutExportButton session={{ id: 'one' }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Export workout JSON' }));
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Retry JSON export' }));
  await screen.findByRole('status');
  expect(screen.queryByRole('alert')).toBeNull();
  expect(download).toHaveBeenCalledTimes(2);
});

it('clears export feedback when the displayed session changes', async () => {
  download.mockResolvedValue(undefined);
  const view = render(<WorkoutExportButton session={{ id: 'one' }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Export workout JSON' }));
  await screen.findByRole('status');
  view.rerender(<WorkoutExportButton session={{ id: 'two' }} />);
  await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
});
