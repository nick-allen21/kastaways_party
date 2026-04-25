// POST /api/respond
//
// Server side of the v14 "response channel" feature. Client gets through the
// 20% (first attempt) / 50% (subsequent) probability gate and POSTs here. We:
//   1. server-pick a random KA member name (excluding usedNames)
//   2. server-pick a random story topic   (excluding usedTopics)
//   3. server-pick one of two fixed openers
//   4. call gpt-4o-mini with a locked system prompt that injects all three
//   5. return { reply, name } back to the browser
//
// All randomness is server-authoritative so the client cannot fish for a
// specific persona / topic by retrying. OPENAI_API_KEY MUST be set in Vercel
// env vars (Production + Preview); without it the endpoint returns 503 and
// the browser falls back to a canned line.

const MEMBERS = require("./_data/members.js");
const TOPICS  = require("./_data/topics.js");

const OPENERS = [
  "You received our message!",
  "Hello? are you really there? this is {NAME}."
];

// Naive in-memory IP rate limit. Survives within a single warm Vercel
// instance; new cold-starts reset it. Good enough as a tripwire — the real
// abuse guard is the client-side 3-attempt cap + 20%/50%/0% gating, which
// keeps real users well under this ceiling.
const RATE_LIMIT_PER_HOUR = 5;
const _rate = new Map();
function rateLimited(ip) {
  if (!ip) return false;
  const now = Date.now();
  const windowStart = now - 60 * 60 * 1000;
  const hits = (_rate.get(ip) || []).filter((t) => t > windowStart);
  if (hits.length >= RATE_LIMIT_PER_HOUR) return true;
  hits.push(now);
  _rate.set(ip, hits);
  return false;
}

function pickRandom(pool, exclude) {
  const blocked = new Set((exclude || []).map((s) => String(s).toLowerCase()));
  const remaining = pool.filter((x) => !blocked.has(String(x).toLowerCase()));
  const src = remaining.length > 0 ? remaining : pool;
  return src[Math.floor(Math.random() * src.length)];
}

function buildSystemPrompt(name, topic, opener) {
  const renderedOpener = opener.replace("{NAME}", name);
  return [
    `You are ${name}, a survivor of the wrecked KA-026 marooned on KA Island.`,
    `You have just barely established a fragile shortwave connection with someone faintly hearing you.`,
    `You can't quite make out what they said back — you only know that someone, somewhere, picked up your signal.`,
    ``,
    `BEGIN your response with EXACTLY this line, verbatim, on its own line:`,
    `"${renderedOpener}"`,
    ``,
    `THEN continue with one or two short fragments about ONLY this topic and nothing else: ${topic}.`,
    ``,
    `Style rules:`,
    `- lowercase mostly, occasional ALL CAPS for emphasis`,
    `- panicked-relieved tone, like you can't believe someone heard you`,
    `- max 200 characters total including the opener`,
    `- no markdown, no quotes around your reply, no parenthetical asides`,
    `- never mention being an AI or model, never break character`,
    `- never reference what the receiver said back; you cannot make out their words`
  ].join("\n");
}

async function callOpenAI(apiKey, systemPrompt, userText) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.6,
      max_tokens: 90,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userText || "(faint, unintelligible signal)" }
      ]
    })
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`openai ${res.status}: ${errText.slice(0, 200)}`);
  }

  const json = await res.json();
  const reply = json && json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
  if (!reply) throw new Error("openai: empty completion");
  return String(reply).trim();
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "no_api_key" });
    return;
  }

  const ip =
    (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "";
  if (rateLimited(ip)) {
    res.status(429).json({ error: "rate_limited" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }
  body = body || {};

  const userText      = String(body.message || "").slice(0, 200);
  const usedNames     = Array.isArray(body.usedNames)  ? body.usedNames.slice(0, 32)  : [];
  const usedTopics    = Array.isArray(body.usedTopics) ? body.usedTopics.slice(0, 32) : [];

  const name   = pickRandom(MEMBERS, usedNames);
  const topic  = pickRandom(TOPICS,  usedTopics);
  const opener = OPENERS[Math.floor(Math.random() * OPENERS.length)];

  const systemPrompt = buildSystemPrompt(name, topic, opener);

  try {
    const reply = await callOpenAI(apiKey, systemPrompt, userText);
    res.status(200).json({ reply, name, topic });
  } catch (err) {
    console.error("[/api/respond] openai call failed:", err && err.message);
    res.status(502).json({ error: "upstream_failed" });
  }
};
