import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { parseFitWithLaps, parseTcx, parseCsv, tryParseSummaryCsv, summarizeStream, SOURCE_PRIORITY, parseAssetFile } from '../../shared/workoutParsers.ts';
import { calcTrimp, calcRTSS, computeNgpSeries, computeDecouplingAndEF } from '../../shared/physiology.ts';
import { reconcileStreams, recomputePhysiology, dominantFileType } from '../../shared/streamReconcile.ts';
import { assertSafeFileUrl } from '../../shared/urlGuard.ts';
import { assertOwnsAthlete } from '../../shared/ownership.ts';
import { reportError } from '../../shared/errorReport.ts';

const MAX_STREAM_SAMPLES = 3600; // cap stored streams (~1hr @1Hz) to avoid oversized records

function storageStream(stream) {
  return stream.map((p) => ({
    time: p.time, heart_rate: p.heart_rate, altitude: p.altitude, distance: p.distance, cadence: p.cadence, speed: p.speed,
  }));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { athlete_id, file_url, file_name, sport, date } = await req.json();
    if (!athlete_id || !file_url || !file_name || !date) {
      return Response.json({ error: 'athlete_id, file_url, file_name and date are required' }, { status: 400 });
    }
    if (new Date(date) > new Date()) {
      return Response.json({ error: 'date cannot be in the future' }, { status: 400 });
    }

    const urlCheck = assertSafeFileUrl(file_url);
    if (!urlCheck.ok) return Response.json({ error: 'file_url not allowed' }, { status: 400 });
    const fileRes = await fetch(file_url);
    if (!fileRes.ok) return Response.json({ error: 'Could not fetch uploaded file' }, { status: 400 });

    const lowerName = file_name.toLowerCase();
    let parsedResult = null;
    let fileType = 'csv';
    if (lowerName.endsWith('.fit')) {
      fileType = 'fit';
      parsedResult = parseFitWithLaps(new Uint8Array(await fileRes.arrayBuffer()));
    } else if (lowerName.endsWith('.tcx')) {
      fileType = 'tcx';
      parsedResult = parseTcx(await fileRes.text());
    } else if (lowerName.endsWith('.csv')) {
      fileType = 'csv';
      const text = await fileRes.text();

      // Summary-CSV path: a multi-row whole-activity history export. Each row is its
      // own session — unchanged bulk-create flow, no assets, no reconciliation.
      const summaryRows = tryParseSummaryCsv(text);
      if (summaryRows) {
        const athlete = await base44.entities.AthleteProfile.get(athlete_id);
        if (!athlete) return Response.json({ error: 'Athlete profile not found' }, { status: 404 });
        if (!(await assertOwnsAthlete(base44, user, athlete_id))) return Response.json({ error: 'Not your athlete profile' }, { status: 403 });

        const restHr = athlete.resting_hr || 60;
        const profileMaxHr = athlete.max_heart_rate;
        const sessionSport = sport || 'running';

        const existingForDedup = await base44.entities.WorkoutSession.filter({ athlete_id });
        const existingByDate = {};
        for (const s of existingForDedup) (existingByDate[s.date] ||= []).push(s);
        const isDuplicateRow = (row) => (existingByDate[row.date || date] || []).some((s) =>
          s.sport === sessionSport &&
          Math.abs((s.duration_minutes || 0) - row.duration_minutes) < 1 &&
          Math.abs((s.distance_km || 0) - (row.distance_km || 0)) < 0.1
        );
        const dedupedRows = summaryRows.filter((row) => !isDuplicateRow(row));
        const skippedDuplicates = summaryRows.length - dedupedRows.length;

        const sessionsToCreate = dedupedRows.map((row) => {
          const maxHr = profileMaxHr || row.max_hr || 190;
          const sessionTrimp = row.avg_hr ? calcTrimp(row.duration_minutes, row.avg_hr, restHr, maxHr, athlete.sex) : 0;
          return {
            athlete_id,
            date: row.date || date,
            sport: sessionSport,
            duration_minutes: row.duration_minutes,
            duration_seconds: row.duration_seconds,
            distance_km: row.distance_km || 0,
            avg_hr: row.avg_hr || undefined,
            max_hr: row.max_hr || undefined,
            source_format: 'csv',
            raw_file_url: file_url,
            session_trimp: sessionTrimp,
          };
        });

        if (sessionsToCreate.length === 0) {
          return Response.json({ success: true, imported_sessions_count: 0, skipped_duplicates: skippedDuplicates, affected_dates: [] });
        }

        const created = await base44.entities.WorkoutSession.bulkCreate(sessionsToCreate);
        const affectedDates = [...new Set(created.map((s) => s.date))];

        const allSessions = await base44.entities.WorkoutSession.filter({ athlete_id });
        const trimpByDate = {};
        for (const s of allSessions) {
          if (!affectedDates.includes(s.date)) continue;
          trimpByDate[s.date] = (trimpByDate[s.date] || 0) + (s.session_trimp || s.session_tss || 0);
        }
        const allMetrics = await base44.entities.DailyMetrics.filter({ athlete_id });
        const metricsByDate = {};
        for (const m of allMetrics) metricsByDate[m.date] = m;

        const metricsToUpdate = [];
        const metricsToCreate = [];
        for (const d of affectedDates) {
          const totalTrimp = Math.round((trimpByDate[d] || 0) * 100) / 100;
          if (metricsByDate[d]) {
            metricsToUpdate.push({ id: metricsByDate[d].id, total_trimp: totalTrimp });
          } else {
            metricsToCreate.push({ athlete_id, date: d, total_trimp: totalTrimp });
          }
        }
        if (metricsToUpdate.length > 0) await base44.entities.DailyMetrics.bulkUpdate(metricsToUpdate);
        if (metricsToCreate.length > 0) await base44.entities.DailyMetrics.bulkCreate(metricsToCreate);

        await base44.functions.invoke('recalculateCTLATLTSB', { athlete_id });
        return Response.json({ success: true, imported_sessions_count: created.length, skipped_duplicates: skippedDuplicates, affected_dates: affectedDates });
      }

      parsedResult = parseCsv(text);
    } else {
      return Response.json({ error: 'Unsupported file type, only .fit, .tcx and .csv are supported' }, { status: 400 });
    }

    if (!parsedResult) return Response.json({ error: 'Could not parse any telemetry from file' }, { status: 400 });
    const { summary: parsed, stream, laps: parsedLaps } = parsedResult;

    const durationMinutes = parsed.duration_minutes || 0;
    const distanceKm = parsed.distance_km || 0;
    if (durationMinutes < 1 || (distanceKm <= 0 && durationMinutes <= 0)) {
      return Response.json({ error: 'File discarded: invalid record (zero distance/duration or under 60 seconds)' }, { status: 400 });
    }

    const athlete = await base44.entities.AthleteProfile.get(athlete_id);
    if (!athlete) return Response.json({ error: 'Athlete profile not found' }, { status: 404 });
    if (!(await assertOwnsAthlete(base44, user, athlete_id))) return Response.json({ error: 'Not your athlete profile' }, { status: 403 });

    const restHr = athlete.resting_hr || 60;
    const maxHr = athlete.max_heart_rate || parsed.max_hr || 190;
    const sessionSport = sport || 'running';

    // Multi-file compatibility: if a matching session already exists for this date/sport/
    // duration/distance, ATTACH this file as a new WorkoutAsset instead of rejecting it.
    // Reconciliation unifies the streams/laps under strict priority, then ONLY the derived
    // physiology (EF/decoupling) is refreshed — load (TRIMP/TSS/CTL/ATL) is never re-added.
    const existingSessions = await base44.entities.WorkoutSession.filter({ athlete_id, date });
    const match = existingSessions.find((s) =>
      s.sport === sessionSport &&
      Math.abs((s.duration_minutes || 0) - durationMinutes) < 1 &&
      Math.abs((s.distance_km || 0) - distanceKm) < 0.1
    );

    if (match) {
      const nowIso = new Date().toISOString();

      // Record the incoming asset row (parsed in memory already).
      await base44.entities.WorkoutAsset.create({
        session_id: match.id,
        athlete_id,
        file_url,
        file_name,
        file_type: fileType,
        source_priority: SOURCE_PRIORITY[fileType],
        parsing_status: 'parsed',
        uploaded_at: nowIso,
      });

      // Gather every bound asset + its re-parsed stream/laps so reconciliation runs over
      // the full set, not just the new file.
      const allAssets = await base44.entities.WorkoutAsset.filter({ session_id: match.id });
      const assetPayloads = [];
      for (const a of allAssets) {
        // The file we just parsed is already in memory — avoid fetching/parsing it again.
        if (a.file_url === file_url) {
          assetPayloads.push({ fileType: a.file_type, stream, laps: parsedLaps || [] });
          continue;
        }
        const reparsed = await parseAssetFile(fetch, a);
        if (reparsed) assetPayloads.push(reparsed);
      }

      const { masterStream, masterLaps } = reconcileStreams(assetPayloads);

      // Re-derive physiology from the unified master stream (never load).
      const physio = recomputePhysiology(masterStream, match.sport, match.duration_minutes || durationMinutes, match.avg_hr ?? parsed.avg_hr ?? null);
      const incomingPhysio = recomputePhysiology(masterStream.length ? masterStream : stream, sessionSport, match.duration_minutes || durationMinutes, match.avg_hr ?? parsed.avg_hr ?? null);

      // Dominant source format reflects which asset type actually produced the master stream.
      const dominant = dominantFileType(assetPayloads) || fileType;

      const update = {
        source_format: dominant,
        efficiency_factor: physio.efficiency_factor ?? incomingPhysio.efficiency_factor ?? undefined,
        aerobic_decoupling: physio.aerobic_decoupling ?? incomingPhysio.aerobic_decoupling ?? undefined,
      };

      // Refresh laps from the reconciled set (keep existing if none reconciled).
      if (masterLaps.length > 0) update.laps = masterLaps;

      // Refresh the stored master stream when it fits the cap.
      if (masterStream.length > 0 && masterStream.length <= MAX_STREAM_SAMPLES) update.streams = storageStream(masterStream);

      // Backfill only previously-null summary metrics from the reconciled stream — never
      // overwrite values the athlete already has, and never touch session_trimp/session_tss.
      const ms = summarizeStream(masterStream);
      if (!match.avg_hr && ms?.avg_hr) update.avg_hr = ms.avg_hr;
      if (!match.max_hr && ms?.max_hr) update.max_hr = ms.max_hr;
      if (!match.avg_power && ms?.avg_power) update.avg_power = ms.avg_power;
      if (!match.avg_cadence && ms?.avg_cadence) update.avg_cadence = ms.avg_cadence;
      if (!match.distance_km && ms?.distance_km) update.distance_km = ms.distance_km;

      await base44.entities.WorkoutSession.update(match.id, update);

      // ZERO-DELTA LOAD GUARD: deliberately do NOT invoke calculateDailyTRIMP or
      // recalculateCTLATLTSB — the session's training load was already counted on the
      // first asset. Attaching a second format enriches the stream/laps only.
      return Response.json({ success: true, attached: true, workout_session_id: match.id });
    }

    // First-upload path: create the session + its first WorkoutAsset, then count load once.
    let aerobic_decoupling = null;
    let efficiency_factor = null;
    let avg_ngp = null;
    if (sessionSport === 'running') {
      const ngpSeries = computeNgpSeries(stream);
      ({ aerobic_decoupling, efficiency_factor, avg_ngp } = computeDecouplingAndEF(ngpSeries, durationMinutes, parsed.avg_hr));
    } else if (sessionSport === 'cycling') {
      const powerSeries = stream
        .filter((p) => typeof p.power === 'number' && typeof p.time === 'number')
        .map((p) => ({ time: p.time, ngp: p.power, hr: p.heart_rate ?? null }));
      ({ aerobic_decoupling, efficiency_factor } = computeDecouplingAndEF(powerSeries, durationMinutes, parsed.avg_hr));
    }

    let sessionTrimp = 0;
    let sessionTss = 0;
    if (parsed.avg_hr) {
      sessionTrimp = calcTrimp(durationMinutes, parsed.avg_hr, restHr, maxHr, athlete.sex);
    } else if (sessionSport === 'running' && athlete.functional_threshold_pace_ms && avg_ngp) {
      sessionTss = calcRTSS(parsed.duration_seconds, avg_ngp, athlete.functional_threshold_pace_ms);
    }

    const session = await base44.entities.WorkoutSession.create({
      athlete_id,
      date,
      sport: sessionSport,
      duration_minutes: durationMinutes,
      duration_seconds: parsed.duration_seconds || Math.round(durationMinutes * 60),
      distance_km: distanceKm,
      avg_hr: parsed.avg_hr || undefined,
      max_hr: parsed.max_hr || undefined,
      avg_power: parsed.avg_power || undefined,
      avg_cadence: parsed.avg_cadence || undefined,
      source_format: fileType,
      raw_file_url: file_url,
      session_trimp: sessionTrimp,
      session_tss: sessionTss,
      efficiency_factor: efficiency_factor ?? undefined,
      aerobic_decoupling: aerobic_decoupling ?? undefined,
      laps: (parsedLaps && parsedLaps.length > 0) ? parsedLaps : undefined,
      streams: stream.length <= MAX_STREAM_SAMPLES ? storageStream(stream) : undefined,
    });

    // Bind the first asset row to the new session.
    await base44.entities.WorkoutAsset.create({
      session_id: session.id,
      athlete_id,
      file_url,
      file_name,
      file_type: fileType,
      source_priority: SOURCE_PRIORITY[fileType],
      parsing_status: 'parsed',
      uploaded_at: new Date().toISOString(),
    });

    await base44.functions.invoke('calculateDailyTRIMP', { athlete_id, date });
    await base44.functions.invoke('postWorkoutAIEvaluation', { athlete_id, workout_session_id: session.id });

    return Response.json({ success: true, workout_session: session, attached: false });
  } catch (error) {
    try { await reportError(base44, { source: 'ingestWorkoutFile', message: error.message, stack: error.stack, severity: 'High' }); } catch {}
    return Response.json({ error: error.message }, { status: 500 });
  }
});