import moment from "moment";

// Coach-conversation injury / recovery signal.
// Scans recent CoachMessage content_text for injury wording and turns it into a
// discrete level (none / caution / hold) plus evidence. Surfaces the same signal
// across Today's Session, Intelligence Hub, Training Plan and Calendar so a coach
// conversation about an injury actually changes what the app prescribes.
//
// The signal is derived only from the coach conversation and the athlete's persisted
// clearance timestamp. A generated training plan is never read here: plan wording is
// not medical clearance and must not be able to retire a hold on its own.

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

// Phrases a coach uses to release a hold. A clearance newer than the injury wording
// resolves it automatically, so "you're cleared to run" ends the hold without the
// athlete having to do anything.
const CLEAR_KEYWORDS = [
  "cleared to run", "cleared for running", "you're cleared", "youre cleared",
  "you are cleared", "resume running", "back to running", "return to running",
  "start running again", "can run again", "good to go", "green light",
  "back on the road", "ease back into running", "no longer on hold", "hold lifted",
];

const CAUTION_KEYWORDS = [
  "sore", "tight", "niggle", "tweak", "monitor", "ease back", "back off",
  "deload", "caution", "stiff", "overdone", "overreached", "fatigued",
  "elevated resting", "hrv low", "under the weather", "unwell", "red flag",
  "watch it", "play it safe", "don't push", "hold off on hard", "be careful",
];

const SOURCE_LABELS = {
  coach: "Coach message",
  performance_summary: "Coach performance summary",
  micro_adjustment: "Coach micro-adjustment",
  plan_generation: "Coach message sent with plan generation",
  athlete_reply: "Athlete reply",
};

/** Human-readable source for an evidence row, so a hold always shows where it came from. */
export function describeSource(type) {
  if (!type) return "Coach conversation";
  return SOURCE_LABELS[type] || "Coach conversation";
}

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

// Timestamps we cannot trust must never move the hold either way: an unparseable or
// future-dated value is treated as absent rather than as "cleared since forever".
function usableTime(value, nowMs) {
  if (!value) return 0;
  const t = new Date(value).getTime();
  if (!Number.isFinite(t)) return 0;
  if (t > nowMs) return 0;
  return t;
}

/**
 * @param {Array<{content_text:string, created_date:string, message_type:string}>} messages
 * @param {{ now?: Date, clearedAt?: string|null }} opts
 */
export function computeInjurySignal(messages, { now = new Date(), clearedAt = null } = {}) {
  const list = (Array.isArray(messages) ? messages : [])
    .filter((m) => m && typeof m.content_text === "string" && m.content_text.trim())
    .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));

  const nowMs = now.getTime();

  // A hold ends at the newest of: the moment the athlete cleared it themselves, or a
  // coach message that releases them. Only messages after that instant can raise it
  // again, so a resolved injury stops following the athlete around.
  const manualMs = usableTime(clearedAt, nowMs);
  const coachClear = list.find((m) => {
    const t = usableTime(m.created_date, nowMs);
    if (!t) return false;
    const text = m.content_text.toLowerCase();
    return CLEAR_KEYWORDS.some((k) => text.includes(k)) && !isInjuryOnly(text);
  });
  const coachMs = coachClear ? usableTime(coachClear.created_date, nowMs) : 0;
  const clearMs = Math.max(manualMs, coachMs);
  const cleared = {
    clearedAt: clearMs ? new Date(clearMs).toISOString() : null,
    clearedByCoach: coachMs > manualMs,
  };

  if (!list.length) {
    return { level: "none", evidence: [], lastInjuryDate: null, summary: null, holdReason: null, ...cleared };
  }

  let level = "none";
  let lastInjuryDate = null;
  const evidence = [];

  for (const m of list) {
    const t = usableTime(m.created_date, nowMs);
    // Ignore bad and future-dated timestamps: clock drift must not create or clear a hold.
    if (!t || t <= clearMs) continue;
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
        source: describeSource(m.message_type),
        snippet: snippet(m.content_text, holdHit || cautionHit),
      });
      if (evidence.length >= 3) break;
    }
  }

  let summary = null;
  let holdReason = null;
  const head = evidence[0];
  if (level === "hold") {
    summary = `Your coach paused running in the conversation on ${fmt(head?.date)}. It stays paused until you are cleared.`;
    holdReason = summary;
  } else if (level === "caution") {
    summary = `The conversation on ${fmt(head?.date)} flagged a niggle or soreness. Back off if it persists and check with your coach before a hard effort.`;
  }

  return { level, evidence, lastInjuryDate, summary, holdReason, ...cleared };
}

// A message that contains hold wording is not a clearance even if it borrows a clearance
// phrase (for example "not cleared to run yet"). Keep the two from cancelling each other.
function isInjuryOnly(text) {
  const blocked = ["not cleared", "no longer cleared", "can't run", "cant run", "cannot run", "still on hold", "not yet cleared"];
  return blocked.some((k) => text.includes(k));
}