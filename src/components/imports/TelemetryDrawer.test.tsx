// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TelemetryDrawer } from './TelemetryDrawer';
import { describe, it, expect, vi } from 'vitest';

describe('TelemetryDrawer', () => {
  it('renders correctly when open', () => {
    render(<TelemetryDrawer isOpen={true} onClose={() => {}} sessionId="test-session" />);
    expect(screen.getByText('Upload Telemetry')).toBeDefined();
  });

  it('does not render when closed', () => {
    render(<TelemetryDrawer isOpen={false} onClose={() => {}} sessionId="test-session" />);
    expect(screen.queryByText('Upload Telemetry')).toBeNull();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<TelemetryDrawer isOpen={true} onClose={onClose} sessionId="test-session" />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });
});