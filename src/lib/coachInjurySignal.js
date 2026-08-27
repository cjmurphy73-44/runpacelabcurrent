import moment from "moment";

// Coach-conversation injury / recovery signal.
// Scans recent CoachMessage content_text for injury wording and turns it into a
// discrete level (none / caution / hold) plus evidence. Surfaces the same signal
// across Today's Session, Intelligence Hub, Training Plan and Calendar so a coach
// conversation about an injury actually changes what the app prescribes.

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

function precedence(l) {
  return l === "hold" ? 2 : l === "caution" ? 1 : 0;
}
function maxLevel(a, b) {
  return precedence(a) >= precedence(b) ? a : b;
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
 * @param {Array<{content_text:string, created_date:string, message_type:string}>} messages
 * @param {{ now?: Date }} opts
 */
export function computeInjurySignal(messages, { now = new Date() } = {}) {
  const list = (Array.isArray(messages) ? messages : [])
    .filter((m) => m && typeof m.content_text === "string" && m.content_text.trim())
    .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));

  if (!list.length) {
    return { level: "none", evidence: [], lastInjuryDate: null, summary: null, holdReason: null };
  }

  const nowMs = now.getTime();
  let level = "none";
  let lastInjuryDate = null;
  const evidence = [];

  for (const m of list) {
    const t = new Date(m.created_date).getTime();
    if (!isFinite(t)) continue;
    const ageDays = (nowMs - t) / 86400000;
    const text = m.content_text.toLowerCase();
    const holdHit = HOLD_KEYWORDS.find((k) => text.includes(k));
    const cautionHit = holdHit ? null : CAUTION_KEYWORDS.find((k) => text.includes(k));
    if (!holdHit && !cautionHit) continue;

    if (!lastInjuryDate || t > new Date(lastInjuryDate).getTime()) {
      lastInjuryDate = new Date(m.created_date).toISOString();
    }

    let cand = "none";
    if (holdHit && ageDays <= 7) cand = "hold";
    else if ((holdHit || cautionHit) && ageDays <= 14) cand = "caution";

    if (cand !== "none") {
      level = maxLevel(level, cand);
      evidence.unshift({
        date: m.created_date,
        type: m.message_type,
        snippet: snippet(m.content_text, holdHit || cautionHit),
      });
      if (evidence.length >= 3) break;
    }
  }

  let summary = null;
  let holdReason = null;
  const head = evidence[0];
  if (level === "hold") {
    summary = `Coach-directed running hold from your conversation on ${fmt(head?.date)} — running is on hold. Today's run has been auto-swapped to rest/recovery (cross-train at easy effort) until the coach clears you.`;
    holdReason = summary;
  } else if (level === "caution") {
    summary = `Recent coach conversation on ${fmt(head?.date)} flagged a niggle or soreness — back off if symptoms persist and check with the coach before any hard effort.`;
  }

  return { level, evidence, lastInjuryDate, summary, holdReason };
}