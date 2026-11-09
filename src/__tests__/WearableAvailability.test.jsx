import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WEARABLE_MAP, syncGuideFor, wearableStatusLabel } from '@/lib/wearableCatalog';
import WearableStep from '@/components/onboarding/WearableStep';

describe('Wearable availability guidance', () => {
  it('renders the onboarding device picker with setup and upload guidance', () => {
    render(<WearableStep onToggle={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Oura/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Strava/ }).textContent).toContain('File upload');
    expect(screen.getAllByText('Provider setup required').length).toBeGreaterThan(0);
  });

  it('offers file upload instead of promising direct Strava sync', () => {
    const [guide] = syncGuideFor(['strava']);
    expect(guide.status).toBe('coming_soon');
    expect(guide.instructions).toContain('Direct Strava sync is not available yet');
    expect(wearableStatusLabel(guide.status)).toBe('Direct sync unavailable');
  });

  it.each(['garmin', 'polar', 'whoop', 'oura'])('does not label %s as a working automatic connection', (key) => {
    expect(WEARABLE_MAP[key].status).toBe('setup_required');
    expect(wearableStatusLabel(WEARABLE_MAP[key].status)).toBe('Setup required');
  });

  it('keeps an offered connection distinct from an authenticated sync result', () => {
    expect(wearableStatusLabel(WEARABLE_MAP.coros.status)).toBe('Check connection');
    expect(WEARABLE_MAP.coros.instructions).not.toContain('nightly');
  });
});
