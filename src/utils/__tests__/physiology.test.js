import { describe, test, expect } from 'vitest';
import { calculateMinettiEnergy } from '../physiology/minetti';
import { calculateThermalPenalty } from '../physiology/thermalPenalty';

describe('Physiology Utilities', () => {
  test('Minetti GAP clamps correctly', () => {
    expect(calculateMinettiEnergy(0.5)).toBeLessThanOrEqual(calculateMinettiEnergy(0.4));
    expect(calculateMinettiEnergy(-0.2)).toBe(calculateMinettiEnergy(-0.12));
  });

  test('Thermal Penalty returns 0% for cool weather', () => {
    expect(calculateThermalPenalty(10, 10)).toBe(0);
  });
});
