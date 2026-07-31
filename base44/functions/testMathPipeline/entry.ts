import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function calcTrimp(durationMin, avgHr, restHr, maxHr, sex) {
  if (!durationMin || !avgHr || !maxHr || maxHr <= restHr) return 0;
  const hrr = Math.max(0, Math.min(1, (avgHr - restHr) / (maxHr - restHr)));
  const isFemale = sex === 'female';
  const a = isFemale ? 0.86 : 0.64;
  const b = isFemale ? 1.67 : 1.92;
  return Math.round(durationMin * hrr * a * Math.exp(b * hrr) * 100) / 100;
}

function gradeCostFactor(grade) {
  const s = Math.max(-0.45, Math.min(0.45, grade));
  const cf = 1 + 19 * s + 50.4 * s * s - 128.2 * s * s * s;
  return Math.max(0.5, Math.min(3, cf));
}

function computeNgpSeries(stream) {
  const series = [];
  for (let i = 1; i < stream.length; i++) {
    const prev = stream[i - 1];
    const cur = stream[i];
    const dTime = cur.time - prev.time;
    const dDist = cur.distance - prev.distance;
    if (!dTime || dTime <= 0 || dDist <= 0) continue;
    const speed = dDist / dTime;
    const dAlt = cur.altitude - prev.altitude;
    const grade = dAlt / dDist;
    const ngp = speed * gradeCostFactor(grade);
    series.push({ time: cur.time, ngp, hr: cur.heart_rate });
  }
  return series;
}

function average(values) {
  const valid = values.filter((v) => typeof v === 'number' && !isNaN(v));
  if (valid.length === 0) return null;
  return valid.reduce((s, v) => s + v, 0) / valid.length;
}

function computeDecouplingAndEF(ngpSeries, durationMinutes) {
  const avgNgpAll = average(ngpSeries.map((p) => p.ngp));
  const avgHrAll = average(ngpSeries.map((p) => p.hr));
  const overallEF = avgNgpAll && avgHrAll ? Math.round((avgNgpAll / avgHrAll) * 10000) / 10000 : null;

  if (durationMinutes < 45) return { aerobic_decoupling: null, efficiency_factor: overallEF };

  const active = ngpSeries.filter((p) => p.time > 300 && p.hr);
  const mid = Math.floor(active.length / 2);
  const half1 = active.slice(0, mid);
  const half2 = active.slice(mid);
  const ef1 = average(half1.map((p) => p.ngp)) / average(half1.map((p) => p.hr));
  const ef2 = average(half2.map((p) => p.ngp)) / average(half2.map((p) => p.hr));
  const decoupling = Math.round(((ef1 - ef2) / ef1) * 10000) / 100;

  return { aerobic_decoupling: decoupling, efficiency_factor: overallEF };
}

function buildMockStream() {
  // 60-minute mock run: HR ramps 130 -> 165 bpm, speed ~3.3 m/s, rolling terrain (+/-5m every 300s).
  const stream = [];
  let distance = 0;
  for (let t = 0; t <= 3600; t += 5) {
    const progress = t / 3600;
    const heart_rate = Math.round(130 + progress * 35);
    const speed = 3.3;
    distance += speed * (t === 0 ? 0 : 5);
    const altitude = 50 + 5 * Math.sin((2 * Math.PI * t) / 300);
    stream.push({ time: t, heart_rate, distance, altitude, speed, cadence: 172 });
  }
  return stream;
}

function simulateCtlAtlTsb(dailyStress, tauC = 42, tauA = 7) {
  const decayC = Math.exp(-1 / tauC);
  const decayA = Math.exp(-1 / tauA);
  let ctl = 0, atl = 0;
  const history = [];
  for (const stress of dailyStress) {
    const tsb = ctl - atl;
    ctl = ctl * decayC + stress * (1 - decayC);
    atl = atl * decayA + stress * (1 - decayA);
    history.push({ stress, ctl: Math.round(ctl * 100) / 100, atl: Math.round(atl * 100) / 100, tsb: Math.round(tsb * 100) / 100 });
  }
  return history;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const restHr = 55;
    const maxHr = 190;
    const sex = 'male';

    const stream = buildMockStream();
    const durationSeconds = stream[stream.length - 1].time - stream[0].time;
    const durationMinutes = Math.round((durationSeconds / 60) * 100) / 100;
    const avgHr = Math.round(average(stream.map((p) => p.heart_rate)));
    const maxHrObserved = Math.max(...stream.map((p) => p.heart_rate));

    const ngpSeries = computeNgpSeries(stream);
    const avgNgp = average(ngpSeries.map((p) => p.ngp));
    const { aerobic_decoupling, efficiency_factor } = computeDecouplingAndEF(ngpSeries, durationMinutes);

    const trimp = calcTrimp(durationMinutes, avgHr, restHr, maxHr, sex);
    const ftPaceMs = 3.6; // mock functional threshold pace
    const intensityFactor = avgNgp / ftPaceMs;
    const rtss = Math.round(((durationSeconds * avgNgp * intensityFactor) / (ftPaceMs * 3600)) * 100 * 100) / 100;

    // Simulate a 10-day training block ending with today's session stress (TRIMP) to show CTL/ATL/TSB evolution.
    const dailyStress = [20, 0, 35, 40, 0, 55, 0, 30, 0, trimp];
    const ctlAtlHistory = simulateCtlAtlTsb(dailyStress);
    const final = ctlAtlHistory[ctlAtlHistory.length - 1];

    console.log('--- Parsed Workout Summary ---');
    console.log(`Duration: ${durationMinutes} min (${durationSeconds}s)`);
    console.log(`Avg HR: ${avgHr} bpm | Max HR: ${maxHrObserved} bpm`);
    console.log('--- Training Stress ---');
    console.log(`TRIMP: ${trimp}`);
    console.log(`rTSS (fallback, hypothetical no-HR case): ${rtss}`);
    console.log('--- Pace & Efficiency ---');
    console.log(`Avg NGP: ${Math.round(avgNgp * 1000) / 1000} m/s`);
    console.log(`Aerobic Decoupling (Pa:HR): ${aerobic_decoupling}%`);
    console.log(`Efficiency Factor: ${efficiency_factor}`);
    console.log('--- CTL / ATL / TSB (10-day simulated block) ---');
    console.log(JSON.stringify(ctlAtlHistory, null, 2));
    console.log(`Final -> CTL: ${final.ctl}, ATL: ${final.atl}, TSB: ${final.tsb}`);

    return Response.json({
      success: true,
      parsed_summary: { duration_minutes: durationMinutes, duration_seconds: durationSeconds, avg_hr: avgHr, max_hr: maxHrObserved },
      training_stress: { trimp, rtss_hypothetical: rtss },
      pace_efficiency: { avg_ngp_ms: Math.round(avgNgp * 1000) / 1000, aerobic_decoupling_pct: aerobic_decoupling, efficiency_factor },
      ctl_atl_tsb_history: ctlAtlHistory,
      final_ctl_atl_tsb: final,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});