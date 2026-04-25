(function () {
  "use strict";

  const TRANSMISSIONS = window.TRANSMISSIONS || [];
  const ANCHORS = window.SIGNAL_ANCHORS || {};

  const FIRST_DROP = new Date(ANCHORS.firstDrop);
  const PARTY_START = new Date(ANCHORS.partyStart);
  const SIGNAL_TERMINATED = new Date(ANCHORS.signalTerminated);

  // ---- Config ----
  const TYPEWRITER_MS_PER_CHAR = 28;
  const SUPPLIES_BAR_CELLS = 18;
  const PREFERS_REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- DOM ----
  const $ = (id) => document.getElementById(id);
  const headerEl = $("transmission-header");
  const bodyEl = $("transmission-body");
  const cursorEl = $("cursor");
  const stampEl = $("transmission-stamp");
  const countdownLabelEl = $("countdown-label");
  const countdownValueEl = $("countdown-value");
  const countdownEl = $("countdown");
  const suppliesPctEl = $("supplies-pct");
  const suppliesBarEl = $("supplies-bar");
  const daysCounterEl = $("days-counter");
  const signalDotEl = $("signal-dot");
  const signalStatusLabelEl = $("signal-status-label");
  const signalLogEl = $("signal-log");
  const signalLogToggleEl = $("signal-log-toggle");
  const signalLogListEl = $("signal-log-list");
  const signalLogCountEl = $("signal-log-count");

  // ---- State ----
  let activeTypewriterTimer = null;
  let currentRenderedId = null;

  // ---------------------------------------------------------------
  // Selection logic
  // ---------------------------------------------------------------

  function getOverrideId() {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("t");
    if (!t) return null;
    const wanted = TRANSMISSIONS.find(
      (x) => x.id.toLowerCase() === ("t" + t.replace(/^t/i, "")).toLowerCase()
    );
    return wanted ? wanted.id : null;
  }

  function getCurrentTransmission(now) {
    const dropped = TRANSMISSIONS.filter((t) => new Date(t.dropAt) <= now);
    return dropped[dropped.length - 1] || TRANSMISSIONS[0];
  }

  function getNextTransmission(now) {
    return TRANSMISSIONS.find((t) => new Date(t.dropAt) > now) || null;
  }

  // ---------------------------------------------------------------
  // Typewriter
  // ---------------------------------------------------------------

  function typewrite(target, text, msPerChar) {
    return new Promise((resolve) => {
      if (activeTypewriterTimer) {
        clearTimeout(activeTypewriterTimer);
        activeTypewriterTimer = null;
      }

      target.textContent = "";
      let i = 0;
      const total = text.length;

      function tick() {
        if (i >= total) {
          activeTypewriterTimer = null;
          resolve();
          return;
        }
        target.textContent += text.charAt(i);
        i++;
        // brief pauses on newlines for breathing room
        const lastChar = text.charAt(i - 1);
        const delay = lastChar === "\n" ? msPerChar * 6 : msPerChar;
        activeTypewriterTimer = setTimeout(tick, delay);
      }

      tick();

      // Skip-on-click anywhere in terminal
      const skip = () => {
        if (activeTypewriterTimer) {
          clearTimeout(activeTypewriterTimer);
          activeTypewriterTimer = null;
        }
        target.textContent = text;
        resolve();
      };
      window.__skipTypewriter = skip;
    });
  }

  // ---------------------------------------------------------------
  // Render a transmission into the center column
  // ---------------------------------------------------------------

  function hasBeenSeen(id) {
    try {
      return sessionStorage.getItem("seen:" + id) === "1";
    } catch (_) {
      return false;
    }
  }

  function markSeen(id) {
    try {
      sessionStorage.setItem("seen:" + id, "1");
    } catch (_) { /* noop */ }
  }

  async function renderTransmission(transmission, opts) {
    opts = opts || {};
    const forceInstant = !!opts.instant;

    headerEl.textContent = transmission.header;

    if (transmission.stamp) {
      stampEl.textContent = transmission.stamp;
      stampEl.hidden = false;
    } else {
      stampEl.hidden = true;
    }

    if (cursorEl) cursorEl.dataset.hidden = "false";

    // Replace the body but preserve the cursor span at end
    bodyEl.innerHTML = "";
    const textNode = document.createElement("span");
    bodyEl.appendChild(textNode);
    bodyEl.appendChild(cursorEl);

    const shouldType =
      !forceInstant &&
      !PREFERS_REDUCED_MOTION &&
      !hasBeenSeen(transmission.id);

    if (shouldType) {
      await typewrite(textNode, transmission.body, TYPEWRITER_MS_PER_CHAR);
    } else {
      textNode.textContent = transmission.body;
    }

    markSeen(transmission.id);
    currentRenderedId = transmission.id;

    updateSignalLogActive();
  }

  // ---------------------------------------------------------------
  // Countdown / supplies / day counter
  // ---------------------------------------------------------------

  function pad(n, width) {
    width = width || 2;
    const s = String(Math.max(0, Math.floor(n)));
    return s.length >= width ? s : "0".repeat(width - s.length) + s;
  }

  function tickCountdown() {
    const now = new Date();
    const next = getNextTransmission(now);

    if (!next) {
      countdownLabelEl.textContent = "SIGNAL TERMINATED";
      countdownValueEl.textContent = "--:--:--:--";
      countdownEl.dataset.state = "terminated";
      return;
    }

    const target = new Date(next.dropAt);
    let delta = target - now;
    if (delta < 0) delta = 0;

    const days = Math.floor(delta / 86400000);
    const hours = Math.floor((delta % 86400000) / 3600000);
    const minutes = Math.floor((delta % 3600000) / 60000);
    const seconds = Math.floor((delta % 60000) / 1000);

    countdownLabelEl.textContent = "NEXT SIGNAL IN";
    countdownValueEl.textContent =
      pad(days) + ":" + pad(hours) + ":" + pad(minutes) + ":" + pad(seconds);
    countdownEl.dataset.state = "active";
  }

  function suppliesPercentAt(now) {
    const total = PARTY_START - FIRST_DROP;
    const elapsed = Math.max(0, now - FIRST_DROP);
    return Math.max(0, 100 - (elapsed / total) * 100);
  }

  function renderBar(pct, cells) {
    const filled = Math.round((pct / 100) * cells);
    const empty = cells - filled;
    return "█".repeat(filled) + "░".repeat(empty);
  }

  function tickAmbient() {
    const now = new Date();
    const pct = suppliesPercentAt(now);

    if (suppliesPctEl) suppliesPctEl.textContent = Math.round(pct) + "%";
    if (suppliesBarEl) suppliesBarEl.textContent = renderBar(pct, SUPPLIES_BAR_CELLS);

    const msPerDay = 86400000;
    const day = Math.max(1, Math.floor((now - FIRST_DROP) / msPerDay) + 1);
    if (daysCounterEl) {
      daysCounterEl.textContent = "DAY " + pad(day) + " OF ██";
    }
  }

  function tickSignalStatus() {
    const now = new Date();
    if (now >= SIGNAL_TERMINATED) {
      signalDotEl.dataset.state = "terminated";
      signalStatusLabelEl.textContent = "SIGNAL STATUS: TERMINATED";
    } else {
      signalDotEl.dataset.state = "active";
      signalStatusLabelEl.textContent = "SIGNAL STATUS: ACTIVE";
    }
  }

  // ---------------------------------------------------------------
  // Signal log
  // ---------------------------------------------------------------

  function buildSignalLog() {
    const now = new Date();
    const dropped = TRANSMISSIONS.filter((t) => new Date(t.dropAt) <= now);
    const current = getCurrentTransmission(now);
    const priors = dropped.filter((t) => t.id !== current.id);

    signalLogCountEl.textContent = String(priors.length);

    signalLogListEl.innerHTML = "";

    if (priors.length === 0) {
      signalLogToggleEl.disabled = true;
      signalLogToggleEl.style.opacity = "0.4";
      signalLogToggleEl.style.cursor = "default";
      return;
    }

    signalLogToggleEl.disabled = false;
    signalLogToggleEl.style.opacity = "";
    signalLogToggleEl.style.cursor = "";

    [current, ...priors]
      .sort((a, b) => new Date(a.dropAt) - new Date(b.dropAt))
      .forEach((t) => {
        const li = document.createElement("li");
        li.className = "signal-log__item";
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "signal-log__btn";
        btn.dataset.id = t.id;
        btn.textContent = "› " + t.header;
        btn.addEventListener("click", () => onSignalLogClick(t.id));
        li.appendChild(btn);
        signalLogListEl.appendChild(li);
      });

    updateSignalLogActive();
  }

  function updateSignalLogActive() {
    const buttons = signalLogListEl.querySelectorAll(".signal-log__btn");
    buttons.forEach((b) => {
      if (b.dataset.id === currentRenderedId) {
        b.dataset.active = "true";
      } else {
        b.dataset.active = "false";
      }
    });
  }

  function onSignalLogClick(id) {
    const t = TRANSMISSIONS.find((x) => x.id === id);
    if (!t) return;
    renderTransmission(t);
    bodyEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleSignalLog() {
    const open = signalLogEl.dataset.open === "true";
    if (open) {
      signalLogEl.dataset.open = "false";
      signalLogToggleEl.setAttribute("aria-expanded", "false");
      signalLogListEl.hidden = true;
    } else {
      signalLogEl.dataset.open = "true";
      signalLogToggleEl.setAttribute("aria-expanded", "true");
      signalLogListEl.hidden = false;
    }
  }

  // ---------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------

  function init() {
    const now = new Date();
    const overrideId = getOverrideId();
    const initial = overrideId
      ? TRANSMISSIONS.find((t) => t.id === overrideId)
      : getCurrentTransmission(now);

    renderTransmission(initial);

    tickCountdown();
    tickAmbient();
    tickSignalStatus();
    buildSignalLog();

    setInterval(tickCountdown, 1000);
    setInterval(tickAmbient, 30000);
    setInterval(tickSignalStatus, 60000);

    signalLogToggleEl.addEventListener("click", toggleSignalLog);

    // Skip typewriter on tap-anywhere (mobile-friendly)
    document.addEventListener(
      "click",
      (e) => {
        if (e.target.closest(".signal-log")) return;
        if (window.__skipTypewriter) {
          window.__skipTypewriter();
          window.__skipTypewriter = null;
        }
      },
      { passive: true }
    );

    // Re-check current transmission when tab regains focus
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      const live = getCurrentTransmission(new Date());
      if (live && live.id !== currentRenderedId && !overrideId) {
        renderTransmission(live, { instant: true });
        buildSignalLog();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
