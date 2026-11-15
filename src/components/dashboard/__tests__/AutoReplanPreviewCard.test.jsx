// @vitest-environment happy-dom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AutoReplanPreviewCard from '../AutoReplanPreviewCard';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('adaptive plan review truthfulness', () => {
  it('does not pretend to sync when no persistence callback is connected', () => {
    render(<AutoReplanPreviewCard />);
    expect(screen.getByRole('button', { name: /plan changes unavailable/i }).disabled).toBe(true);
    expect(screen.getByText(/no calendar update occurs/i)).toBeTruthy();
    expect(screen.queryByText(/successfully adapted/i)).toBeNull();
  });

  it('only confirms completion after the provided callback resolves', async () => {
    let finish;
    const onAcceptReplan = vi.fn(() => new Promise((resolve) => { finish = resolve; }));
    render(<AutoReplanPreviewCard onAcceptReplan={onAcceptReplan} />);
    fireEvent.click(screen.getByRole('button', { name: /request plan review/i }));
    expect(onAcceptReplan).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('status')).toBeNull();
    finish();
    expect(await screen.findByRole('status')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toMatch(/review request completed/i);
  });

  it('shows an accessible failure instead of false success on rejected persistence', async () => {
    const onAcceptReplan = vi.fn().mockRejectedValue(new Error('backend unavailable'));
    render(<AutoReplanPreviewCard onAcceptReplan={onAcceptReplan} />);
    fireEvent.click(screen.getByRole('button', { name: /request plan review/i }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
    await waitFor(() => expect(screen.getByRole('button', { name: /request plan review/i }).disabled).toBe(false));
  });
});
