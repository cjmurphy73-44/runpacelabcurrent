import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { num, clampHr, toDateKey, parseLlmResult, flagLowConfidenceFields } from '../../shared/ocrHelpers.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { image_url } = body;
    if (!image_url || typeof image_url !== 'string') {
      return Response.json({ error: 'Invalid parameters', details: { image_url: 'missing' } }, { status: 400 });
    }

    let athlete_id;
    try {
      const profiles = await base44.entities.AthleteProfile.filter({ created_by_id: user.id });
      if (profiles && profiles.length > 0) athlete_id = profiles[0].id;
    } catch { /* best-effort — OCR can run before a profile exists */ }

    const prompt = [
      'You are a precise recovery-screenshot OCR engine.',
      'Extract the daily recovery / biometric metrics shown in the image (e.g. WHOOP, Oura, Garmin, Apple Health, Fitbit recovery screens) and return ONLY a JSON object (no prose, no markdown fences) with these fields:',
      '- date: the calendar date this reading applies to, as YYYY-MM-DD (use the reading/sleep date, not the device timestamp); empty string if not visible',
      '- hrv: Heart Rate Variability in milliseconds as a number (0 if not shown)',
      '- sleep_score: sleep score / sleep quality as an integer 0-100 (0 if not shown)',
      '- sleep_duration_hours: total sleep duration in hours as a number (0 if not shown)',
      '- resting_hr: resting heart rate in bpm as an integer (0 if not shown)',
      '- readiness_score: overall recovery / readiness score as an integer 0-100 (0 if not shown)',
      '- confidence_score: your overall OCR confidence from 0.0 to 1.0',
      '- flagged_fields: array of field names whose value could not be read confidently',
      'If the image is not a recovery/biometric screenshot, set confidence_score to 0.',
    ].join('\n');

    const response_json_schema = {
      type: 'object',
      properties: {
        date: { type: 'string' },
        hrv: { type: 'number' },
        sleep_score: { type: 'integer' },
        sleep_duration_hours: { type: 'number' },
        resting_hr: { type: 'integer' },
        readiness_score: { type: 'integer' },
        confidence_score: { type: 'number' },
        flagged_fields: { type: 'array', items: { type: 'string' } },
      },
      required: ['confidence_score', 'flagged_fields'],
    };

    const llmRes = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [image_url],
      response_json_schema,
    });

    const parsed = parseLlmResult(llmRes);

    const flagged = new Set(Array.isArray(parsed.flagged_fields) ? parsed.flagged_fields.map((f) => String(f)) : []);

    const today = new Date().toISOString().slice(0, 10);
    const date = toDateKey(parsed.date) || today;

    const hrv = num(parsed.hrv, null);
    const sleep_score = num(parsed.sleep_score, null);
    const sleep_duration_hours = num(parsed.sleep_duration_hours, null);
    const resting_hr = clampHr(parsed.resting_hr);
    if (resting_hr === undefined && parsed.resting_hr != null) flagged.add('resting_hr');
    const readiness_score = num(parsed.readiness_score, null);

    const confidence = flagLowConfidenceFields(
      parsed,
      ['hrv', 'sleep_score', 'sleep_duration_hours', 'resting_hr', 'readiness_score'],
      flagged
    );

    return Response.json({
      athlete_id,
      image_url,
      date,
      hrv: hrv > 0 ? Math.round(hrv * 10) / 10 : null,
      sleep_score: sleep_score > 0 ? Math.round(sleep_score) : null,
      sleep_duration_hours: sleep_duration_hours > 0 ? Math.round(sleep_duration_hours * 10) / 10 : null,
      resting_hr: resting_hr ?? null,
      readiness_score: readiness_score > 0 ? Math.round(readiness_score) : null,
      confidence_score: Math.round(confidence * 100) / 100,
      flagged_fields: [...flagged],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}