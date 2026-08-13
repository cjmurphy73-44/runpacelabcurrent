import { calculateMinettiEnergy } from './minetti';
import { calculateThermalPenalty } from './thermalPenalty';

export const getIntensityDomain = (grade, temp, dewPoint) => {
  const energy = calculateMinettiEnergy(grade);
  const penalty = calculateThermalPenalty(temp, dewPoint);
  return energy * (1 + penalty);
};

export const estimateFuelUtilization = (intensity) => {
  // Simplified fuel model
  return {
    carbs: intensity > 0.7 ? 0.8 : 0.4,
    fat: intensity > 0.7 ? 0.2 : 0.6
  };
};
