// base44/shared/calories.ts
// Device-first energy expenditure with a transparent thermal fallback.
//
// Rule: a watch that measured the session wins. Garmin/COROS/Polar report active
// kilocalories from their own on-device models (heart rate + motion + user profile),
// which is strictly better evidence than anything we can reconstruct after the fact.
// We therefore never overwrite a native value; the estimate only runs when the
// provider sent none, and it is stored with its basis so the UI can label it.
//
// Fallback model: Keytel et al. (2005) heart-rate regression for kcal/min, scaled by
// a documented thermoregulatory factor derived from ambient temperature and humidity.
// Heat raises HR for the same mechanical work, so a pure HR formula over-reads in the
// heat unless the regression is damped — we apply that correction instead of letting
// Queensland summer inflate every easy run.

function num(v, fallback = null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// Thermoregulatory multiplier for the HR-based estimate.
// Core assumption, kept deliberately simple and documented:
//   • no adjustment below 22 °C
//   • +1.5% per °C above 22 °C, capped at +12%
//   • +0.5% per 10 percentage points of humidity above 60%, capped at +3%
// The two are additive on top of 1.0. Returns factor + a short human-readable note.
export function thermalAdjustment(temperatureC, humidityPct) {
  const temp = num(temperatureC);
  const humidity = num(humidityPct);
  if (temp === null && humidity === null) {
    return { factor: 1, note: null, applied: false };
  }
  let factor = 1;
  const parts = [];
  if (temp !== null && temp > 22) {
    const heat = Math.min((temp - 22) * 0.015, 0.12);
    factor += heat;
    parts.push(`${Math.round(temp)}°C`);
  }
  if (humidity !== null && humidity > 60) {
    const humid = Math.min(((humidity - 60) / 10) * 0.005, 0.03);
    factor += humid;
    parts.push(`${Math.round(humidity)}% humidity`);
  }
  const applied = factor > 1.0001;
  return {
    factor: Math.round(factor * 1000) / 1000,
    note: applied ? `heat adjustment +${Math.round((factor - 1) * 100)}% (${parts.join(', ')})` : null,
    applied,
  };
}

// Keytel HR regression, kcal/min. Clamped to a physiologically sane band so a bad
// HR reading cannot produce a four-figure burn on a 20-minute jog.
function keytelKcalPerMin(avgHr, weightKg, age, sex) {
  const isFemale = sex === 'female';
  const raw = isFemale
    ? (-20.4022 + 0.4472 * avgHr - 0.1263 * weightKg + 0.074 * age) / 4.184
    : (-55.0969 + 0.6309 * avgHr + 0.1988 * weightKg + 0.2017 * age) / 4.184;
  if (!Number.isFinite(raw)) return null;
  return Math.max(2, Math.min(25, raw));
}

// Estimate active calories for a session that carries no device value.
// Returns { kcal, basis } where basis explains exactly what was assumed.
export function estimateActiveCalories({ durationMin, avgHr, weightKg, age, sex, temperatureC, humidityPct }) {
  const duration = num(durationMin, 0);
  if (!duration || duration <= 0) return { kcal: null, basis: null };

  const thermal = thermalAdjustment(temperatureC, humidityPct);
  const hr = num(avgHr);
  const weight = num(weightKg);

  let perMin = null;
  let basis = '';
  if (hr && weight && num(age)) {
    perMin = keytelKcalPerMin(hr, weight, num(age), sex);
    if (perMin) basis = 'Estimated · Keytel heart-rate regression';
  }
  if (!perMin) {
    // No usable HR/body data: a conservative moderate-effort rate, clearly labelled.
    perMin = 8;
    basis = 'Estimated · moderate-effort baseline (no HR profile)';
  }

  const kcal = Math.round(perMin * duration * thermal.factor);
  if (thermal.applied && thermal.note) basis += ` · ${thermal.note}`;
  return { kcal: kcal > 0 ? kcal : null, basis, thermal_factor: thermal.factor };
}

// Resolve the calorie value to store: device value when the provider sent one,
// otherwise the labelled estimate.
export function resolveActiveCalories({ nativeKcal, durationMin, avgHr, weightKg, age, sex, temperatureC, humidityPct }) {
  const native = num(nativeKcal);
  if (native && native > 0) {
    return {
      active_calories: Math.round(native),
      calories_source: 'device',
      calories_basis: 'Device-reported active calories',
    };
  }
  const est = estimateActiveCalories({ durationMin, avgHr, weightKg, age, sex, temperatureC, humidityPct });
  if (!est.kcal) return {};
  return {
    active_calories: est.kcal,
    calories_source: 'estimated',
    calories_basis: est.basis,
  };
}