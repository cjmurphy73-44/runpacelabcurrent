export const SPORT_MULTIPLIERS = {
  running: 1.0,
  indoorCycling: 0.7,
  strength: 0.5,
};

export const getWeightedLoad = (load, activityType) => {
  const multiplier = SPORT_MULTIPLIERS[activityType] || 1.0;
  return load * multiplier;
};
