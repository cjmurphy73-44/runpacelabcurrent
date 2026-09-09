// Shared helpers for the OCR screenshot parser functions.

export function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function clampHr(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.min(Math.max(Math.round(n), 30), 230);
}

export function toDateKey(s) {
  if (!s || typeof s !== 'string') return undefined;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const t = Date.parse(s);
  return isNaN(t) ? undefined : new Date(t).toISOString().slice(0, 10);
}

// InvokeLLM returns a dict when response_json_schema is provided; guard against a string fallback.
export function parseLlmResult(llmRes) {
  if (llmRes && typeof llmRes === 'object' && !Array.isArray(llmRes)) return llmRes;
  if (typeof llmRes === 'string') {
    try { return JSON.parse(llmRes); } catch { return {}; }
  }
  return {};
}

// When overall confidence is low (<0.85), flag every populated numeric field so the
// verification modal highlights them in amber.
export function flagLowConfidenceFields(parsed, fields, flagged) {
  let confidence = Math.max(0, Math.min(1, num(parsed.confidence_score, 0.5)));
  if (confidence < 0.85) {
    fields.forEach((f) => {
      const v = parsed[f];
      if (v !== null && v !== undefined && Number(v) !== 0) flagged.add(f);
    });
  }
  return Math.round(confidence * 100) / 100;
}