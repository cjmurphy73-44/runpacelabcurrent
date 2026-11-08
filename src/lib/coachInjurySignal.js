import moment from "moment";

// Coach-conversation injury / recovery signal.
// Scans recent CoachMessage content_text for injury wording and turns it into a
// advisory only; conversation text cannot create a running restriction. Surfaces the same signal
// across Today's Session, Intelligence Hub, Training Plan and Calendar.
// It does not change prescriptions or establish medical/coach clearance.

const HOLD_KEYWORDS = [
  "injur", "can't run", "cant run", "cannot run", "no running", "stop running",
  "shut it down", "shut down", "take a break", "take some time off", "time off running",
  "recovery week", "rest week", "cross-train", "cross train", "bike only",
  "cycling only", "pool run", "aquajog", "aqua jog", "water running", "physio",
  "physical therapy", "physical therapist", "rehab", "stress fracture",
  "shin splint", "tendinopath", "tendinitis", "plantar", "achilles", "meniscus",
  "torn", "tear", "pulled", "strain", "groin strain", "hamstring tear", "layoff",
  "off running", "dnf", "dnr", "bike instead", "rest instead", "knee pain",
  "completely off", "off for a",
];

const CAUTION_KEYWORDS = [
  "sore", "tight", "niggle", "tweak", "monitor", "ease back", "back off",
  "deload", "caution", "stiff", "overdone", "overreached", "fatigued",
  "elevated resting", "hrv low", "under the weather", "unwell", "red flag",
  "watch it", "play it safe", "don't push", "hold off on hard", "be careful",
];

function snippet(text, keyword, radius = 140) {
  if (!text) return "";
  const idx = text.toLowerCase().indexOf(keyword);
  if (idx < 0) return text.slice(0, radius);
  const start = Math.max(0, idx - Math.floor(radius / 3));
  const end = Math.min(text.length, idx + keyword.length + Math.ceil((radius * 2) / 3));
  return (start > 0 ? "…" : "") + text.slice(start, end).trim() + (end < text.length ? "…" : "");
}

function fmt(dateStr) {
  if (!dateStr) return "recently";
  try {
    return moment(dateStr).format("MMM D");
  } catch {
    return "recently";
  }
}

/**
 * @param {Array<{content_text:string, created_date:string, message_type:string, updated_date?:string, review_key?:string}>} messages
 * @param {{ now?: Date }} opts
 */
export function computeInjurySignal(messages, { now = new Date() } = {}) {
  const list = (Array.isArray(messages) ? messages : [])
    .filter((m) => m && typeof m.content_text === "string" && m.content_text.trim())
    .sort((a, b) => Math.max(Date.parse(b.created_date) || 0, Date.parse(b.updated_date) || 0) - Math.max(Date.parse(a.created_date) || 0, Date.parse(a.updated_date) || 0));

  if (!list.length) {
    return { level: "none", evidence: [], lastInjuryDate: null, summary: null, holdReason: null };
  }

  const nowMs = now.getTime();
  let level = "none";
  let lastInjuryDate = null;
  const evidence = [];

  for (const m of list) {
    const created = new Date(m.created_date).getTime();
    const updated = m.updated_date ? new Date(m.updated_date).getTime() : created;
    if (!Number.isFinite(created) || !Number.isFinite(updated)) continue;
    const t = Math.max(created, updated);
    if (!Number.isFinite(t) || t > nowMs) continue;
    const ageDays = (nowMs - t) / 86400000;
    const text = m.content_text.toLowerCase();
    // Negated/clearance statements and questions are not active restrictions.
    if (/\?|\b(not injured|no injury|injury[- ]free|cleared to|cleared for|resume running)\b/.test(text)) continue;
    const holdHit = HOLD_KEYWORDS.find((k) => text.includes(k));
    const cautionHit = holdHit ? null : CAUTION_KEYWORDS.find((k) => text.includes(k));
    if (!holdHit && !cautionHit) continue;

    if (!lastInjuryDate || t > new Date(lastInjuryDate).getTime()) {
      lastInjuryDate = new Date(t).toISOString();
    }

    let cand = "none";
    if ((holdHit || cautionHit) && ageDays <= 14) cand = "caution";

    if (cand !== "none") {
      level = cand;
      evidence.push({
        date: new Date(t).toISOString(),
        review_key: m.review_key,
        type: m.message_type,
        snippet: snippet(m.content_text, holdHit || cautionHit),
      });
      if (evidence.length >= 3) break;
    }
  }

  let summary = null;
  let holdReason = null;
  const head = evidence[0];
  if (level === "caution") {
    summary = `Your conversation on ${fmt(head?.date)} mentions recovery or discomfort. Review whether this is still relevant. Your saved training plan has not been changed.`;
  }

  return { level, evidence, lastInjuryDate, summary, holdReason };
}