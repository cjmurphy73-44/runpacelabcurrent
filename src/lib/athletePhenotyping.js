function average(values) {
  if (!values || values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function percentileRank(sortedPoolValues, value) {
  if (!sortedPoolValues || sortedPoolValues.length === 0) return 50;
  const sorted = [...sortedPoolValues].sort((a, b) => a - b);
  const countBelowOrEqual = sorted.filter((v) => v <= value).length;
  return (countBelowOrEqual / sorted.length) * 100;
}

export function computePhenotypeInsights(dailyMetrics, biometricTelemetry) {
  const dm = [...dailyMetrics].sort((a, b) => a.date.localeCompare(b.date));
  if (dm.length === 0) return [];

  const hrvByDate = {};
  biometricTelemetry.forEach((b) => { if (typeof b.hrv_ms === "number") hrvByDate[b.date] = b.hrv_ms; });

  const last60 = dm.slice(-60);
  const hrvBaselineValues = last60.map((d) => hrvByDate[d.date]).filter((v) => typeof v === "number");
  const hrvBaselineMean = average(hrvBaselineValues);
  const rhrBaselineValues = last60.map((d) => d.resting_hr).filter((v) => typeof v === "number");
  const rhrBaselineMean = average(rhrBaselineValues);

  const recent7 = dm.slice(-7);
  const prior7 = dm.slice(-14, -7);
  const recentHrvAvg = average(recent7.map((d) => hrvByDate[d.date]).filter((v) => typeof v === "number"));
  const recentRhrAvg = average(recent7.map((d) => d.resting_hr).filter((v) => typeof v === "number"));
  const recentAtlAvg = average(recent7.map((d) => d.calculated_atl).filter((v) => typeof v === "number"));
  const priorAtlAvg = average(prior7.map((d) => d.calculated_atl).filter((v) => typeof v === "number"));

  const latest = dm[dm.length - 1];
  const insights = [];

  if (latest.calculated_tsb < -15 && recentHrvAvg !== null && hrvBaselineMean !== null && recentHrvAvg >= hrvBaselineMean * 0.95) {
    const pct = percentileRank(hrvBaselineValues, recentHrvAvg);
    insights.push({
      type: "discordance",
      severity: "positive",
      title: "Autonomic vs. Mechanical Discordance",
      narrative: `TSB is deeply negative at ${latest.calculated_tsb.toFixed(1)}, yet your 7-day HRV average of ${recentHrvAvg.toFixed(1)}ms sits at the ${pct.toFixed(0)}th percentile of your rolling 60-day baseline (${hrvBaselineMean.toFixed(1)}ms). Your autonomic nervous system isn't registering the mechanical load as stress — this points to an athlete who absorbs high volume exceptionally well. Standard "rest now" advice is likely premature here; continued loading is probably well-tolerated as long as resting HR and sleep stay stable.`,
    });
  }

  if (
    recentAtlAvg !== null && priorAtlAvg !== null && recentAtlAvg < priorAtlAvg &&
    recentHrvAvg !== null && hrvBaselineMean !== null && recentHrvAvg < hrvBaselineMean * 0.9 &&
    recentRhrAvg !== null && rhrBaselineMean !== null && recentRhrAvg > rhrBaselineMean + 3
  ) {
    const hrvPct = percentileRank(hrvBaselineValues, recentHrvAvg);
    insights.push({
      type: "red_flag",
      severity: "danger",
      title: "Sympathetic Fatigue Red Flag",
      narrative: `ATL has dropped from ${priorAtlAvg.toFixed(1)} to ${recentAtlAvg.toFixed(1)} over the last two weeks — normally a "freshening" signal — but HRV has fallen to the ${hrvPct.toFixed(0)}th percentile of baseline (${recentHrvAvg.toFixed(1)}ms vs. ${hrvBaselineMean.toFixed(1)}ms) while resting HR has climbed to ${recentRhrAvg.toFixed(1)}bpm, ${(recentRhrAvg - rhrBaselineMean).toFixed(1)}bpm above baseline. This divergence between falling training load and rising autonomic stress is a classic marker of functional overreaching. TSB alone (currently ${latest.calculated_tsb.toFixed(1)}) is masking systemic fatigue — prioritize recovery despite "fresh" numbers.`,
    });
  }

  const holisticWindow = dm.slice(-14).filter((d) => d.holistic_factors);
  if (holisticWindow.length > 0) {
    const highSoreness = holisticWindow.filter((d) => d.holistic_factors.muscle_soreness === "high").length;
    const medSoreness = holisticWindow.filter((d) => d.holistic_factors.muscle_soreness === "medium").length;
    const underFueled = holisticWindow.filter((d) => d.holistic_factors.nutrition_status === "under_fueled").length;
    const travelDays = holisticWindow.filter((d) => d.holistic_factors.travel_jet_lag).length;

    let multiplier = 1 + highSoreness * 0.06 + medSoreness * 0.03 + underFueled * 0.04 + travelDays * 0.08;
    multiplier = Math.min(multiplier, 1.8);

    if (multiplier > 1.05) {
      const baseLow = 5;
      const baseHigh = 25;
      const compression = (multiplier - 1) * 40;
      const adjustedLow = baseLow + compression;
      const adjustedHigh = baseHigh - compression;
      insights.push({
        type: "holistic_multiplier",
        severity: "warning",
        title: "Holistic Stress Multiplier",
        narrative: `Over the last 14 days: ${highSoreness} high-soreness day(s), ${medSoreness} medium-soreness day(s), ${underFueled} under-fueled day(s), and ${travelDays} travel/jet-lag day(s) combine into a stress multiplier of ${multiplier.toFixed(2)}x. This compresses your ideal TSB peaking window from +${baseLow} to +${baseHigh} down to +${adjustedLow.toFixed(0)} to +${adjustedHigh.toFixed(0)} — you'll need a fresher (higher) TSB than usual to feel and perform your best right now.`,
      });
    }
  }

  return insights;
}