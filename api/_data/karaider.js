// v21 — KARAIDER INTERCEPT detection data.
//
// Server-side regex + copy used by /api/respond to decide whether the
// receiver tripped one of the four intercept vectors. Client owns the
// monologue + ASCII map render; the server just announces "yes, this
// is an intercept" and which flavour to render.

// Vector A1 — explicit "let me talk to the raiders" first-message phrasing.
// Anchored loose enough to catch natural variants but tight enough not to
// fire on accidental mentions inside an otherwise-normal first turn.
//
// `k?a?raider` is intentionally generous: it matches `raider`, `kraider`
// (the most common typo — people miss the silent 'a'), `araider`, AND
// `karaider`. Earlier `(ka)?raider` only caught `raider` / `karaider`
// and missed the very common `Kraider` spelling, which is the failure
// mode we hit in the first live QA pass — typing "I want to talk to
// the KrAiders" tripped nothing because the regex couldn't see the
// 'r' as the start of `raider` once the leading 'K' was there.
const RAIDER_TOKEN = "k?a?raider"; // shared token; bumps both A1 + A2.

const MAGIC_PHRASE_PATTERNS = [
  new RegExp("(let|put|switch|connect|tune|patch).{0,20}(me|us)?.{0,20}(to|with|through|onto).{0,30}(the )?(" + RAIDER_TOKEN + ")", "i"),
  new RegExp("(" + RAIDER_TOKEN + ")s?.{0,20}\\b(i|we)\\b.{0,10}(want|need|gotta|wanna).{0,10}(to )?(talk|speak|hear)", "i"),
  new RegExp("(talk|speak)\\s+(to|with)\\s+(the\\s+)?(" + RAIDER_TOKEN + ")", "i"),
  new RegExp("^[\\s>\"'-]*(hey\\s+|yo\\s+|sup\\s+)?(" + RAIDER_TOKEN + ")s?\\b", "i"),
  new RegExp("\\b(open|hail|raise)\\s+(the\\s+)?(" + RAIDER_TOKEN + ")", "i")
];

// Vector A2 — cumulative mention tally. Counts on the user side only;
// the impostor's reply mentioning Karaiders does NOT count. Same
// generous spelling tolerance as A1.
const RAIDER_MENTION_RE = new RegExp(
  "\\b(" + RAIDER_TOKEN + "s?|the others|who else|who('?s| is) out there|hostile[s]?|enemies|enemy|other survivors?|who attacked)\\b",
  "i"
);

// Vector B — single-line "rare interception" stingers. Picked at random.
const RARE_LINES = [
  "INTERFERENCE — UNKNOWN BROADCAST: \"if you come you'll meet our same fate.\"",
  "INTERFERENCE — UNKNOWN BROADCAST: \"stop calling. we are listening.\"",
  "INTERFERENCE — UNKNOWN BROADCAST: \"we crashed here too. no one came.\""
];

// Probability a single normal-path turn becomes a rare interception.
const RARE_PROB = 0.05;

// Returns the current Pacific Time hour (0-23) and ymd-hm pieces for the
// time/party-window checks. Using Intl.DateTimeFormat keeps DST correct.
function nowInPT(now) {
  const d = now || new Date();
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false
  });
  const parts = fmt.formatToParts(d).reduce((acc, p) => {
    if (p.type !== "literal") acc[p.type] = p.value;
    return acc;
  }, {});
  return {
    year:   Number(parts.year),
    month:  Number(parts.month),
    day:    Number(parts.day),
    hour:   Number(parts.hour) % 24,
    minute: Number(parts.minute)
  };
}

// Vector C — atmospheric window: 01:00 ≤ PT < 05:00.
function inAtmosphericWindow(pt) {
  return pt.hour >= 1 && pt.hour < 5;
}

// Vector D — the actual party window: Sat May 2 2026, 14:00–19:00 PT.
function inPartyWindow(pt) {
  return (
    pt.year === 2026 &&
    pt.month === 5 &&
    pt.day === 2 &&
    pt.hour >= 14 &&
    pt.hour < 19
  );
}

function tripsMagicPhrase(text) {
  if (!text) return false;
  for (const re of MAGIC_PHRASE_PATTERNS) {
    if (re.test(text)) return true;
  }
  return false;
}

// Tally how many user-side raider mentions exist across history + current
// message. Server-side mention counting beats trusting the client.
function countRaiderMentions(history, currentMessage) {
  let n = 0;
  if (Array.isArray(history)) {
    for (const m of history) {
      if (m && m.role === "user" && typeof m.content === "string") {
        const matches = m.content.match(new RegExp(RAIDER_MENTION_RE.source, "gi"));
        if (matches) n += matches.length;
      }
    }
  }
  if (typeof currentMessage === "string") {
    const matches = currentMessage.match(new RegExp(RAIDER_MENTION_RE.source, "gi"));
    if (matches) n += matches.length;
  }
  return n;
}

function pickRare() {
  return RARE_LINES[Math.floor(Math.random() * RARE_LINES.length)];
}

// The decision function. Returns:
//   null                                                 — no intercept
//   { mode: "full",  variant: "default" | "party" }       — full takeover
//   { mode: "rare",  line: string }                       — single-line stinger
//
// Vector precedence (first match wins):
//   1. magic phrase on first turn  → full / variant by time
//   2. cumulative ≥ 3 mentions     → full / variant by time
//   3. atmospheric window (1-4am)  → full / default
//   4. party window (5/2 14-19)    → full / party
//   5. 5% rare roll                → rare
function checkIntercept({ message, history, now }) {
  const pt = nowInPT(now);
  const variant = inPartyWindow(pt) ? "party" : "default";
  const isFirstTurn = !Array.isArray(history) || history.length === 0;

  if (isFirstTurn && tripsMagicPhrase(message)) {
    return { mode: "full", variant };
  }

  if (countRaiderMentions(history, message) >= 3) {
    return { mode: "full", variant };
  }

  if (inAtmosphericWindow(pt)) {
    return { mode: "full", variant: "default" };
  }

  if (inPartyWindow(pt)) {
    return { mode: "full", variant: "party" };
  }

  if (Math.random() < RARE_PROB) {
    return { mode: "rare", line: pickRare() };
  }

  return null;
}

module.exports = {
  checkIntercept,
  // exported for tests / forced-trigger paths
  MAGIC_PHRASE_PATTERNS,
  RAIDER_MENTION_RE,
  RARE_LINES,
  RARE_PROB,
  nowInPT,
  inAtmosphericWindow,
  inPartyWindow,
  tripsMagicPhrase,
  countRaiderMentions,
  pickRare
};
