// Cautious interpretation of workout metrics. Avoid attributing physiological
// adaptations or causes to a single recording. These descriptions are not
// diagnoses or an inference about fatigue, hydration or fuelling.
export function efficiencyFactorInterpretation(value, sport) {
  if (value == null || value === "" || !Number.isFinite(Number(value)) || Number(value) <= 0) return null;
  const unit = sport === "cycling" ? "power output" : "pace-derived output";
  return `Efficiency factor ${Number(value).toFixed(2)} compares ${unit} with heart rate for this session. Changes across comparable sessions may be informative, but alone do not establish a fitness gain.`;
}

export function aerobicDecouplingInterpretation(value) {
  if (value == null || value === "" || !Number.isFinite(Number(value)) || Math.abs(Number(value)) < 5) return null;
  return `Aerobic decoupling ${Number(value).toFixed(1)}% describes a change in the output-to-heart-rate relationship during this session. Effort, terrain, conditions, measurement quality and fuelling can affect it; this result alone cannot identify the cause.`;
}
