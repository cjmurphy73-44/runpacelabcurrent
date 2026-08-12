import { calculateMinettiEnergy } from '../physiology/minetti';
import { calculateThermalPenalty } from '../physiology/thermalPenalty';

describe('Physiology Utilities', () => {
  test('Minetti clamping logic', () => {
    expect(calculateMinettiEnergy(-0.20)).toBeCloseTo(calculateMinettiEnergy(-0.12));
    expect(calculateMinettiEnergy(0.50)).toBeCloseTo(calculateMinettiEnergy(0.40));
    expect(calculateMinettiEnergy(NaN)).toBe(3.6);
  });

  test('Thermal penalty threshold', () => {
    expect(calculateThermalPenalty(20, 20)).toBe(0);
    expect(calculateThermalPenalty(60, 60)).toBeGreaterThan(0);
  });
});
