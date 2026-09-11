import { describe, it, expect } from 'vitest';
import { calculateNorwegianPrescription, calculateDecoupling } from '../norwegianEngine';

describe('Norwegian Engine & Decoupling', () => {
  it('calculates correct prescription for 5x2000 at VDOT 50', () => {
    const rx = calculateNorwegianPrescription(50, '5x2000');
    expect(rx.format).toBe('5x2000');
    expect(rx.repeatCount).toBe(5);
    expect(rx.repeatDistanceMeters).toBe(2000);
    expect(rx.totalWorkMeters).toBe(10000);
    expect(rx.targetLactateMin).toBe(2.0);
    expect(rx.targetLactateMax).toBe(3.5);
    expect(rx.formattedPace).toBeDefined();
  });

  it('calculates aerobic decoupling correctly and flags excess drift', () => {
    // First half efficient, second half slower speed with higher HR (high drift)
    const result = calculateDecoupling({
      firstHalfAvgSpeed: 15.0, // km/h
      firstHalfAvgHr: 150,
      secondHalfAvgSpeed: 14.0,
      secondHalfAvgHr: 162,
    });

    expect(result.decouplingPct).toBeGreaterThan(5.0);
    expect(result.isExceeded).toBe(true);
    expect(result.status).toContain('exceeding');
  });

  it('reports normal decoupling when cardiac drift is within 5%', () => {
    const result = calculateDecoupling({
      firstHalfAvgSpeed: 15.0,
      firstHalfAvgHr: 150,
      secondHalfAvgSpeed: 14.9,
      secondHalfAvgHr: 152,
    });

    expect(result.isExceeded).toBe(false);
    expect(result.status).toContain('well within');
  });
});
