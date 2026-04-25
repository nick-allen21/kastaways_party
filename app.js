(function () {
  "use strict";

  const TRANSMISSIONS = window.TRANSMISSIONS || [];
  const ANCHORS = window.SIGNAL_ANCHORS || {};
  const RATIONS_ORDER = window.RATIONS_ORDER || [];

  const FIRST_DROP = new Date(ANCHORS.firstDrop);
  const PARTY_START = new Date(ANCHORS.partyStart);
  const SIGNAL_TERMINATED = new Date(ANCHORS.signalTerminated);

  // ---- Config ----
  const TYPEWRITER_DEFAULT_MS = 28;
  const RATIONS_BAR_CELLS = 18;
  const PREFERS_REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const BOOT_PHASES = [
    { label: "ESTABLISHING SIGNAL...",     barMs: 800 },
    { label: "SCANNING FREQUENCIES...",    barMs: 850 },
    { label: "LOCKING SOURCE: 664.LOMITA.CT.94305", barMs: 750 },
    { label: "DECRYPTING TRANSMISSION...", barMs: 900 }
  ];
  const BOOT_BAR_CELLS = 18;
  const BOOT_MS_PER_CHAR = 12;
  const BOOT_INTER_PHASE_MS = 150;
  const BOOT_FINAL_HOLD_MS = 250;
  const BOOT_FLASH_MS = 200;
  const BOOT_FADE_MS = 250;

  // ---- DOM ----
  const $ = (id) => document.getElementById(id);
  const headerEl = $("transmission-header");
  const bodyEl = $("transmission-body");
  const cursorEl = $("cursor");
  const stampEl = $("transmission-stamp");
  const transmissionEl = $("transmission");
  const countdownLabelEl = $("countdown-label");
  const countdownValueEl = $("countdown-value");
  const countdownEl = $("countdown");
  const rationsPctEl = $("rations-pct");
  const rationsBarEl = $("rations-bar");
  const daysCounterEl = $("days-counter");
  const signalDotEl = $("signal-dot");
  const signalStatusLabelEl = $("signal-status-label");
  const signalLogEl = $("signal-log");
  const signalLogToggleEl = $("signal-log-toggle");
  const signalLogListEl = $("signal-log-list");
  const signalLogCountEl = $("signal-log-count");
  const rationsSectionEl = $("rations");
  const rationsListEl = $("rations-list");
  const bootSeqEl = $("boot-seq");
  const bootStepsEl = $("boot-seq-steps");
  const bootFlashEl = $("boot-flash");
  const signalLossEl = $("signal-loss");
  const terminalEl = $("terminal");

  const respondEl        = $("respond");
  const respondFormEl    = $("respond-form");
  const respondInputEl   = $("respond-input");
  const respondSendEl    = $("respond-send");
  const respondCounterEl = $("respond-counter");
  const respondBarEl     = $("respond-bar");
  const respondBarFillEl = $("respond-bar-fill");
  const respondBarStatusEl = $("respond-bar-status");
  const respondAttemptsEl = $("respond-attempts");
  const respondLogEl     = $("respond-log");
  const respondClosedEl  = $("respond-closed");
  const respondHandleRowEl  = $("respond-handle-row");
  const respondHandleEl     = $("respond-handle");

  // ---- State ----
  let activeTypewriterTimer = null;
  let currentRenderedId = null;
  let activeMoraleTimer = null;
  let activeBootTimer = null;
  let activeBootPhaseResolver = null;
  let bootSkipped = false;
  let activeGlitchTimer = null;

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
  // Typewriter — pacing-aware
  // ---------------------------------------------------------------

  function typewrite(target, text, opts) {
    opts = opts || {};
    const defaultMs = opts.defaultMs || TYPEWRITER_DEFAULT_MS;
    const pacing = opts.pacing || {};

    return new Promise((resolve) => {
      if (activeTypewriterTimer) {
        clearTimeout(activeTypewriterTimer);
        activeTypewriterTimer = null;
      }

      target.textContent = "";
      let i = 0;
      let lineIdx = 0;
      const total = text.length;

      function lineMs(idx) {
        return (pacing[idx] && pacing[idx].ms) || defaultMs;
      }

      function tick() {
        if (i >= total) {
          activeTypewriterTimer = null;
          if (cursorEl) cursorEl.dataset.paused = "false";
          resolve();
          return;
        }

        const ch = text.charAt(i);
        target.textContent += ch;
        i++;

        let delay;
        if (ch === "\n") {
          // End of current line — apply pauseAfter override or default newline pause.
          const lp = pacing[lineIdx];
          const pauseAfter = lp && lp.pauseAfter;
          delay = pauseAfter || lineMs(lineIdx) * 6;

          if (cursorEl && pauseAfter && pauseAfter >= 500) {
            cursorEl.dataset.paused = "true";
            setTimeout(() => {
              if (cursorEl) cursorEl.dataset.paused = "false";
            }, pauseAfter);
          }

          lineIdx++;
        } else {
          delay = lineMs(lineIdx);
        }

        activeTypewriterTimer = setTimeout(tick, delay);
      }

      tick();

      const skip = () => {
        if (activeTypewriterTimer) {
          clearTimeout(activeTypewriterTimer);
          activeTypewriterTimer = null;
        }
        if (cursorEl) cursorEl.dataset.paused = "false";
        target.textContent = text;
        resolve();
      };
      window.__skipTypewriter = skip;
    });
  }

  // ---------------------------------------------------------------
  // Boot / signal acquisition pre-roll
  // ---------------------------------------------------------------

  function shouldRunBoot() {
    if (PREFERS_REDUCED_MOTION) return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get("boot") === "1") return true;
    try {
      return sessionStorage.getItem("booted") !== "1";
    } catch (_) {
      return false;
    }
  }

  function markBooted() {
    try {
      sessionStorage.setItem("booted", "1");
    } catch (_) { /* noop */ }
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function emptyBar(cells) {
    return "░".repeat(cells);
  }

  function createStepDom(label) {
    const step = document.createElement("div");
    step.className = "boot-seq__step";

    const labelEl = document.createElement("div");
    labelEl.className = "boot-seq__label";
    labelEl.textContent = "> ";

    const barLine = document.createElement("div");
    barLine.className = "boot-seq__barline";

    const barLeft = document.createElement("span");
    barLeft.className = "boot-seq__bracket";
    barLeft.textContent = "[";

    const barEl = document.createElement("span");
    barEl.className = "boot-seq__bar";
    barEl.textContent = emptyBar(BOOT_BAR_CELLS);

    const barRight = document.createElement("span");
    barRight.className = "boot-seq__bracket";
    barRight.textContent = "]";

    const tagEl = document.createElement("span");
    tagEl.className = "boot-seq__tag";
    tagEl.textContent = "--";

    barLine.appendChild(barLeft);
    barLine.appendChild(barEl);
    barLine.appendChild(barRight);
    barLine.appendChild(document.createTextNode(" "));
    barLine.appendChild(tagEl);

    step.appendChild(labelEl);
    step.appendChild(barLine);

    return { step, label: labelEl, bar: barEl, tag: tagEl };
  }

  function typewriteLabel(target, text, msPerChar) {
    return new Promise((resolve) => {
      let i = 0;
      target.textContent = "> ";
      function step() {
        if (bootSkipped) {
          target.textContent = "> " + text;
          activeBootTimer = null;
          resolve();
          return;
        }
        if (i >= text.length) {
          activeBootTimer = null;
          resolve();
          return;
        }
        target.textContent += text.charAt(i);
        i++;
        activeBootTimer = setTimeout(step, msPerChar);
      }
      step();
    });
  }

  function fillBar(barEl, tagEl, cells, totalMs) {
    return new Promise((resolve) => {
      let filled = 0;
      const baseMs = totalMs / cells;
      activeBootPhaseResolver = () => {
        // snap to full
        filled = cells;
        barEl.textContent = "█".repeat(cells);
        if (tagEl) tagEl.textContent = "OK";
        activeBootPhaseResolver = null;
        if (activeBootTimer) {
          clearTimeout(activeBootTimer);
          activeBootTimer = null;
        }
        resolve();
      };

      function step() {
        if (bootSkipped) {
          if (activeBootPhaseResolver) activeBootPhaseResolver();
          return;
        }
        if (filled >= cells) {
          if (tagEl) tagEl.textContent = "OK";
          activeBootPhaseResolver = null;
          activeBootTimer = null;
          resolve();
          return;
        }
        filled++;
        barEl.textContent = "█".repeat(filled) + "░".repeat(cells - filled);
        if (tagEl && filled < cells) {
          const pct = Math.round((filled / cells) * 100);
          tagEl.textContent = pad(pct, 2) + "%";
        }
        const jitter = 0.6 + Math.random() * 0.8;
        activeBootTimer = setTimeout(step, baseMs * jitter);
      }
      step();
    });
  }

  async function runBootPhase(phase) {
    const dom = createStepDom();
    bootStepsEl.appendChild(dom.step);
    await typewriteLabel(dom.label, phase.label, BOOT_MS_PER_CHAR);
    if (bootSkipped) {
      dom.bar.textContent = "█".repeat(BOOT_BAR_CELLS);
      dom.tag.textContent = "OK";
      return;
    }
    await fillBar(dom.bar, dom.tag, BOOT_BAR_CELLS, phase.barMs);
  }

  async function flashScreen() {
    if (!bootFlashEl) return;
    bootFlashEl.dataset.active = "true";
    await wait(BOOT_FLASH_MS);
    bootFlashEl.dataset.active = "false";
  }

  async function fadeOutBoot() {
    if (!bootSeqEl) return;
    bootSeqEl.style.opacity = "0";
    await wait(BOOT_FADE_MS);
    bootSeqEl.hidden = true;
  }

  async function runBoot() {
    if (!bootSeqEl || !bootStepsEl) return;

    bootSkipped = false;
    bootStepsEl.innerHTML = "";
    bootSeqEl.hidden = false;
    bootSeqEl.style.opacity = "1";

    if (transmissionEl) transmissionEl.dataset.hidden = "true";
    if (rationsSectionEl) rationsSectionEl.dataset.hidden = "true";

    window.__skipBoot = () => {
      if (bootSkipped) return;
      bootSkipped = true;
      if (activeBootTimer) {
        clearTimeout(activeBootTimer);
        activeBootTimer = null;
      }
      if (activeBootPhaseResolver) activeBootPhaseResolver();
    };

    for (let i = 0; i < BOOT_PHASES.length; i++) {
      await runBootPhase(BOOT_PHASES[i]);
      if (bootSkipped) break;
      if (i < BOOT_PHASES.length - 1) {
        await wait(BOOT_INTER_PHASE_MS);
      }
    }

    if (bootSkipped) {
      // make sure every phase row visually completes
      bootStepsEl.querySelectorAll(".boot-seq__step").forEach((step) => {
        const bar = step.querySelector(".boot-seq__bar");
        const tag = step.querySelector(".boot-seq__tag");
        if (bar) bar.textContent = "█".repeat(BOOT_BAR_CELLS);
        if (tag) tag.textContent = "OK";
      });
    }

    await wait(BOOT_FINAL_HOLD_MS);
    await flashScreen();
    await fadeOutBoot();

    window.__skipBoot = null;
    if (transmissionEl) transmissionEl.dataset.hidden = "false";
    if (rationsSectionEl) rationsSectionEl.dataset.hidden = "false";
  }

  function skipBoot() {
    if (activeBootTimer) {
      clearTimeout(activeBootTimer);
      activeBootTimer = null;
    }
    activeBootPhaseResolver = null;
    if (bootSeqEl) {
      bootSeqEl.hidden = true;
      bootSeqEl.style.opacity = "1";
    }
    if (bootFlashEl) bootFlashEl.dataset.active = "false";
    if (transmissionEl) transmissionEl.dataset.hidden = "false";
    if (rationsSectionEl) rationsSectionEl.dataset.hidden = "false";
  }

  // ---------------------------------------------------------------
  // Rations log
  // ---------------------------------------------------------------

  function renderBar(pct, cells) {
    const filled = Math.round((pct / 100) * cells);
    const empty = cells - filled;
    return "█".repeat(filled) + "░".repeat(empty);
  }

  const MORALE_GLYPHS = ["▓", "░", "▒", "█", "?", "▚", "▞"];
  const MORALE_VALUE_VARIANTS = [
    "???",
    "???",
    "[REDACTED]",
    "ERR%",
    "??%",
    "0_0%",
    "NULL"
  ];

  function randomMoraleBar(cells) {
    let s = "";
    for (let i = 0; i < cells; i++) {
      s += MORALE_GLYPHS[Math.floor(Math.random() * MORALE_GLYPHS.length)];
    }
    return s;
  }

  function randomMoraleValue() {
    if (Math.random() < 0.18) {
      return Math.floor(Math.random() * 100) + "%";
    }
    return MORALE_VALUE_VARIANTS[Math.floor(Math.random() * MORALE_VALUE_VARIANTS.length)];
  }

  function renderRations(transmission) {
    if (!rationsListEl) return;
    const data = (transmission && transmission.rations) || {};
    rationsListEl.innerHTML = "";

    RATIONS_ORDER.forEach((entry) => {
      const item = data[entry.key] || {};
      const isGlitch = !!item.glitch;
      const pct = typeof item.pct === "number" ? Math.max(0, Math.min(100, item.pct)) : null;

      const li = document.createElement("li");
      li.className = "rations__row";
      li.dataset.key = entry.key;

      if (isGlitch) {
        li.dataset.state = "glitch";
      } else if (pct !== null && pct < 15) {
        li.dataset.state = "critical";
      } else {
        li.dataset.state = "normal";
      }

      const label = document.createElement("span");
      label.className = "rations__label";
      label.textContent = entry.label;
      li.appendChild(label);

      const bar = document.createElement("span");
      bar.className = "rations__bar";
      bar.textContent = isGlitch
        ? randomMoraleBar(RATIONS_BAR_CELLS)
        : renderBar(pct === null ? 0 : pct, RATIONS_BAR_CELLS);
      li.appendChild(bar);

      const pctEl = document.createElement("span");
      pctEl.className = "rations__pct";
      pctEl.textContent = isGlitch
        ? randomMoraleValue()
        : (pct === null ? "--%" : Math.round(pct) + "%");
      li.appendChild(pctEl);

      rationsListEl.appendChild(li);
    });

    startMoraleTicker();
  }

  function startMoraleTicker() {
    if (activeMoraleTimer) {
      clearInterval(activeMoraleTimer);
      activeMoraleTimer = null;
    }
    if (PREFERS_REDUCED_MOTION) return;
    activeMoraleTimer = setInterval(tickMorale, 30000);
  }

  function tickMorale() {
    if (!rationsListEl) return;
    const row = rationsListEl.querySelector('.rations__row[data-key="morale"]');
    if (!row) return;
    const bar = row.querySelector(".rations__bar");
    const pct = row.querySelector(".rations__pct");
    if (bar) bar.textContent = randomMoraleBar(RATIONS_BAR_CELLS);
    if (pct) pct.textContent = randomMoraleValue();
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

    if (cursorEl) {
      cursorEl.dataset.hidden = "false";
      cursorEl.dataset.paused = "false";
    }

    bodyEl.innerHTML = "";
    const textNode = document.createElement("span");
    bodyEl.appendChild(textNode);
    bodyEl.appendChild(cursorEl);

    renderRations(transmission);

    const shouldType =
      !forceInstant &&
      !PREFERS_REDUCED_MOTION &&
      !hasBeenSeen(transmission.id);

    if (shouldType) {
      await typewrite(textNode, transmission.body, {
        defaultMs: TYPEWRITER_DEFAULT_MS,
        pacing: transmission.pacing || {}
      });
    } else {
      textNode.textContent = transmission.body;
    }

    markSeen(transmission.id);
    currentRenderedId = transmission.id;

    if (respondActiveTid !== transmission.id) {
      respondResetForTransmission(transmission.id);
    }

    updateSignalLogActive();
  }

  // ---------------------------------------------------------------
  // Countdown / ambient strip / day counter
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

  function rationsPercentAt(now) {
    const total = PARTY_START - FIRST_DROP;
    const elapsed = Math.max(0, now - FIRST_DROP);
    return Math.max(0, 100 - (elapsed / total) * 100);
  }

  function tickAmbient() {
    const now = new Date();
    const pct = rationsPercentAt(now);

    if (rationsPctEl) rationsPctEl.textContent = Math.round(pct) + "%";
    if (rationsBarEl) rationsBarEl.textContent = renderBar(pct, RATIONS_BAR_CELLS);

    // DAY counter tracks the active transmission index (T1 -> DAY 01, ..., T6 -> DAY 06)
    // not calendar days, so the label flips at midnight when the transmission flips.
    const current = getCurrentTransmission(now);
    const day = current ? TRANSMISSIONS.indexOf(current) + 1 : 1;
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
  // Periodic CRT glitches
  // ---------------------------------------------------------------
  // Every 8-22s a random glitch fires: brief RGB chromatic split on the
  // transmission text, a whole-page slip with hue rotation, or a "signal
  // loss" full-screen static flash. Disabled under prefers-reduced-motion.

  const GLITCH_TYPES = [
    "rgb",     // chromatic aberration on transmission body + header
    "rgb",     // (weighted)
    "slip",    // page-level translate + hue rotate
    "loss",    // signal-loss static flash
    "stutter"  // rgb -> brief delay -> slip (compound)
  ];

  function clearGlitches() {
    if (bodyEl && bodyEl.dataset.glitch) delete bodyEl.dataset.glitch;
    if (headerEl && headerEl.dataset.glitch) delete headerEl.dataset.glitch;
    if (terminalEl && terminalEl.dataset.glitch) delete terminalEl.dataset.glitch;
    if (signalLossEl) signalLossEl.dataset.active = "false";
  }

  function fireGlitchRgb() {
    if (!bodyEl) return;
    bodyEl.dataset.glitch = "rgb";
    if (headerEl) headerEl.dataset.glitch = "rgb";
    setTimeout(() => {
      if (bodyEl && bodyEl.dataset.glitch === "rgb") delete bodyEl.dataset.glitch;
      if (headerEl && headerEl.dataset.glitch === "rgb") delete headerEl.dataset.glitch;
    }, 290);
  }

  function fireGlitchSlip() {
    if (!terminalEl) return;
    terminalEl.dataset.glitch = "slip";
    setTimeout(() => {
      if (terminalEl && terminalEl.dataset.glitch === "slip") delete terminalEl.dataset.glitch;
    }, 270);
  }

  function fireGlitchLoss() {
    if (!signalLossEl) return;
    signalLossEl.dataset.active = "false";
    void signalLossEl.offsetWidth;
    signalLossEl.dataset.active = "true";
    setTimeout(() => {
      if (signalLossEl) signalLossEl.dataset.active = "false";
    }, 230);
  }

  function fireGlitchStutter() {
    fireGlitchRgb();
    setTimeout(fireGlitchSlip, 140);
    setTimeout(fireGlitchLoss, 280);
  }

  function fireRandomGlitch() {
    const type = GLITCH_TYPES[Math.floor(Math.random() * GLITCH_TYPES.length)];
    switch (type) {
      case "rgb":     fireGlitchRgb(); break;
      case "slip":    fireGlitchSlip(); break;
      case "loss":    fireGlitchLoss(); break;
      case "stutter": fireGlitchStutter(); break;
    }
  }

  function scheduleNextGlitch(minMs, maxMs) {
    if (PREFERS_REDUCED_MOTION) return;
    if (activeGlitchTimer) {
      clearTimeout(activeGlitchTimer);
      activeGlitchTimer = null;
    }
    const wait = minMs + Math.random() * (maxMs - minMs);
    activeGlitchTimer = setTimeout(() => {
      if (document.visibilityState === "visible") {
        fireRandomGlitch();
      }
      scheduleNextGlitch(5000, 10000);
    }, wait);
  }

  function startGlitchLoop() {
    if (PREFERS_REDUCED_MOTION) return;
    scheduleNextGlitch(2000, 4000);
  }

  // Debug hook: window.__glitch("rgb"|"slip"|"loss"|"stutter") to fire on demand.
  window.__glitch = function (type) {
    switch (type) {
      case "rgb":     fireGlitchRgb(); break;
      case "slip":    fireGlitchSlip(); break;
      case "loss":    fireGlitchLoss(); break;
      case "stutter": fireGlitchStutter(); break;
      default:        fireRandomGlitch();
    }
  };

  // ---------------------------------------------------------------
  // Respond / KA band (v17)
  // ---------------------------------------------------------------
  // Two-phase conversation, hard safety rails server-side. State is per-
  // transmission (resets at midnight when the next T drops); the receiver
  // name is GLOBAL (one entry, persists across all 6 transmissions).
  //
  // Phase A — first contact:
  //   Up to FIRST_MAX send attempts at FIRST_RATE each. If every roll fails
  //   the channel locks for this transmission. On success, the API picks a
  //   KA member + topic and writes back a reply (no fixed opener — the
  //   model just sounds excited the connection worked).
  //
  // Phase B — connected:
  //   The receiver is now talking to the same KA member. Each follow-up
  //   rolls FOLLOW_RATE up to FOLLOW_MAX sends; the FINAL follow-up is a
  //   forced fail (LLM-drift cap). So the absolute ceiling is 2 successful
  //   AI calls per user per transmission (connect + 1 follow-up if the
  //   coin lands). The full conversation history rides on every successful
  //   call so the impostor remembers what was said.
  //
  // Phase C — closed:
  //   Form hidden, KA BAND CLOSED banner shown. Resets when the active
  //   transmission flips.

  const FIRST_RATE  = 0.30;          // each first-contact attempt
  const FIRST_MAX   = 5;             // hard cap on first-contact sends
  const FOLLOW_RATE = 0.50;          // first follow-up roll
  const FOLLOW_MAX  = 2;             // total follow-up sends; the 2nd is forced fail
  const FAIL_MODES = [
    { id: "mid-stall",     weight: 4 },
    { id: "no-carrier",    weight: 2 },
    { id: "ghost",         weight: 2 },
    { id: "corrupt",       weight: 2 }
  ];
  const FAIL_TOTAL_WEIGHT = FAIL_MODES.reduce((s, m) => s + m.weight, 0);

  const RESPOND_LS_KEY  = "respond:v3";          // bumped: state schema gained `conversation`
  const RECEIVER_LS_KEY = "kastaways:receiver_name";  // global, shared across transmissions
  const RESPOND_TYPE_MS = 26;
  const HANDLE_MIN_LEN  = 2;
  const HANDLE_MAX_LEN  = 24;

  let respondActiveTid = null;
  let respondState = null;        // { tid, phase, firstAttempts, followAttempts, connectedName, usedNames, usedTopics, log[] }
  let respondReceiverName = null; // global handle
  let respondInFlight = false;
  let respondBarTimer = null;

  function respondFreshState(tid) {
    return {
      tid: tid,
      phase: "first",         // "first" | "connected" | "closed"
      firstAttempts: 0,
      followAttempts: 0,
      connectedName: null,
      usedNames: [],
      usedTopics: [],
      conversation: [],       // [{role:"user"|"assistant", content:string}, ...]
      log: []
    };
  }

  function respondLoadState(tid) {
    let raw = null;
    try { raw = localStorage.getItem(RESPOND_LS_KEY); } catch (_) { /* noop */ }

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.tid === tid && typeof parsed.phase === "string") {
          // backfill any field added in a newer schema version
          if (!Array.isArray(parsed.conversation)) parsed.conversation = [];
          return parsed;
        }
      } catch (_) { /* fall through to fresh */ }
    }
    return respondFreshState(tid);
  }

  function respondSaveState() {
    try {
      localStorage.setItem(RESPOND_LS_KEY, JSON.stringify(respondState));
    } catch (_) { /* noop */ }
  }

  function respondLoadReceiverName() {
    try {
      const v = localStorage.getItem(RECEIVER_LS_KEY) || "";
      return sanitizeHandle(v) || null;
    } catch (_) { return null; }
  }

  function respondSaveReceiverName(name) {
    try {
      if (name) localStorage.setItem(RECEIVER_LS_KEY, name);
      else      localStorage.removeItem(RECEIVER_LS_KEY);
    } catch (_) { /* noop */ }
  }

  function sanitizeHandle(s) {
    return String(s || "")
      .replace(/[^A-Za-z0-9 _'-]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, HANDLE_MAX_LEN);
  }

  function respondResetForTransmission(tid) {
    respondActiveTid = tid;
    respondState = respondLoadState(tid);
    respondInFlight = false;
    respondBarHide();
    respondRenderLog();
    respondRenderAttemptsCounter();
    respondApplyChannelState();
    if (respondInputEl) respondInputEl.value = "";
    respondUpdateCounter();
  }

  function respondPhase() {
    return respondState ? respondState.phase : "first";
  }

  function respondIsClosed() {
    return respondPhase() === "closed";
  }

  function respondRenderAttemptsCounter() {
    // The counter is intentionally left blank — we don't surface remaining
    // attempts to the receiver. The only public state is "form available"
    // vs "KA BAND CLOSED" (which the closed banner conveys directly).
    if (!respondAttemptsEl) return;
    respondAttemptsEl.textContent = "";
    delete respondAttemptsEl.dataset.state;
  }

  function respondHandleSet() {
    return !!(respondReceiverName && respondReceiverName.length >= HANDLE_MIN_LEN);
  }

  function respondApplyChannelState() {
    if (!respondEl) return;
    const phase = respondPhase();
    const closed = phase === "closed";
    const nameOk = respondHandleSet();
    const allowSend = !closed && !respondInFlight && nameOk;

    respondEl.dataset.closed = closed ? "true" : "false";
    respondEl.dataset.phase  = phase;
    respondEl.dataset.handle = nameOk ? "set" : "unset";
    if (respondClosedEl) respondClosedEl.hidden = !closed;

    if (respondInputEl) {
      respondInputEl.disabled = !allowSend;
      if (!nameOk) {
        respondInputEl.placeholder = "enter your name above first ↑";
      } else {
        respondInputEl.placeholder = phase === "first"
          ? "hello? are you out there?"
          : "static crackles. say something to keep them on the line...";
      }
    }
    if (respondSendEl)   respondSendEl.disabled = !allowSend;
  }

  function respondUpdateCounter() {
    if (!respondInputEl || !respondCounterEl) return;
    const len = respondInputEl.value.length;
    respondCounterEl.textContent = len + "/140";
    respondCounterEl.dataset.state = len > 120 ? "warn" : "ok";
  }

  // -- log rendering ---------------------------------------------------

  function respondRenderLog() {
    if (!respondLogEl || !respondState) return;
    respondLogEl.innerHTML = "";
    respondState.log.forEach((entry) => respondAppendLogDom(entry, { instant: true }));
  }

  function respondAppendLogDom(entry, opts) {
    if (!respondLogEl) return null;
    opts = opts || {};
    const li = document.createElement("li");
    li.className = "respond__entry";
    li.dataset.kind = entry.kind;

    const meta = document.createElement("span");
    meta.className = "respond__entry-meta";
    meta.textContent = entry.meta || "";
    li.appendChild(meta);

    const body = document.createElement("span");
    body.className = "respond__entry-body";
    body.textContent = opts.instant ? (entry.text || "") : "";
    li.appendChild(body);

    respondLogEl.appendChild(li);
    return { li: li, body: body };
  }

  function respondPushLog(entry, opts) {
    opts = opts || {};
    respondState.log.push(entry);
    respondSaveState();
    return respondAppendLogDom(entry, opts);
  }

  // -- send bar animator ----------------------------------------------

  function respondBarHide() {
    if (!respondBarEl) return;
    if (respondBarTimer) {
      clearInterval(respondBarTimer);
      respondBarTimer = null;
    }
    delete respondBarEl.dataset.state;
    if (respondBarFillEl)   respondBarFillEl.style.width = "0%";
    if (respondBarStatusEl) respondBarStatusEl.textContent = "";
  }

  function respondBarSet(state, label, pct) {
    if (!respondBarEl) return;
    respondBarEl.dataset.state = state;
    if (respondBarFillEl)   respondBarFillEl.style.width = (pct == null ? 100 : pct) + "%";
    if (respondBarStatusEl) respondBarStatusEl.textContent = label;
  }

  function respondAnimateBarTo(targetPct, totalMs, label) {
    return new Promise((resolve) => {
      if (!respondBarEl) { resolve(); return; }
      respondBarEl.dataset.state = "sending";
      if (respondBarStatusEl) respondBarStatusEl.textContent = label;
      const startWidth = parseFloat(respondBarFillEl?.style.width || "0") || 0;
      const startTs = performance.now();

      if (respondBarTimer) clearInterval(respondBarTimer);

      function step() {
        const t = Math.min(1, (performance.now() - startTs) / totalMs);
        const eased = t; // linear works fine for this aesthetic
        const w = startWidth + (targetPct - startWidth) * eased;
        if (respondBarFillEl) respondBarFillEl.style.width = w.toFixed(2) + "%";
        if (t >= 1) {
          clearInterval(respondBarTimer);
          respondBarTimer = null;
          resolve();
        }
      }

      respondBarTimer = setInterval(step, 30);
    });
  }

  // -- failure mode renderers -----------------------------------------
  //
  // Each returns a Promise that resolves once the bar finishes its sequence.
  // After resolve, the caller appends the corresponding log entry.

  async function failMidStall() {
    const stallAt = 30 + Math.random() * 50; // stall between 30% and 80%
    await respondAnimateBarTo(stallAt, 600 + Math.random() * 700, "TRANSMITTING...");
    await wait(450);
    respondBarSet("fail-stall", "PACKET LOSS · TRANSMISSION DROPPED", stallAt);
    await wait(900);
    return {
      meta: "FAILED · " + Math.round(stallAt) + "% SENT",
      kind: "fail",
      text: "→ PACKET LOSS. TRANSMISSION DROPPED."
    };
  }

  async function failNoCarrier() {
    await respondAnimateBarTo(8, 240, "DIALING 664.LOMITA.CT.94305...");
    respondBarSet("fail-no-carrier", "NO CARRIER · 664.LOMITA.CT.94305 OFFLINE", 8);
    await wait(900);
    return {
      meta: "FAILED · NO CARRIER",
      kind: "fail",
      text: "→ NO CARRIER. 664.LOMITA.CT.94305 IS NOT BROADCASTING."
    };
  }

  async function failGhost() {
    await respondAnimateBarTo(100, 1000 + Math.random() * 400, "TRANSMITTING...");
    respondBarSet("sending", "DELIVERED", 100);
    await wait(600);
    respondBarSet("fail-stall", "NO REPLY · LISTENING...", 100);
    await wait(1400);
    return {
      meta: "DELIVERED · NO REPLY",
      kind: "fail-ghost",
      text: "(no reply. only static.)"
    };
  }

  async function failCorrupt() {
    await respondAnimateBarTo(100, 900 + Math.random() * 400, "TRANSMITTING...");
    respondBarSet("fail-stall", "REPLY CORRUPTED · UNREADABLE", 100);
    await wait(900);
    return {
      meta: "REPLY RECEIVED · CORRUPTED",
      kind: "fail",
      text: "→ ░░ ?? █▒░ R▚CV F▞IL · BYTES SCRA▓BLED"
    };
  }

  function pickFailMode(forcedId) {
    if (forcedId) {
      const found = FAIL_MODES.find((m) => m.id === forcedId);
      if (found) return found.id;
    }
    let r = Math.random() * FAIL_TOTAL_WEIGHT;
    for (let i = 0; i < FAIL_MODES.length; i++) {
      r -= FAIL_MODES[i].weight;
      if (r <= 0) return FAIL_MODES[i].id;
    }
    return FAIL_MODES[0].id;
  }

  async function runFailMode(modeId) {
    switch (modeId) {
      case "no-carrier": return failNoCarrier();
      case "ghost":      return failGhost();
      case "corrupt":    return failCorrupt();
      case "mid-stall":
      default:           return failMidStall();
    }
  }

  // -- success path: animate bar full, fetch /api/respond, typewrite reply ---
  //
  // Two-phase: pass connectedName on follow-ups so the server keeps the SAME
  // KA member voice. On any non-2xx (moderation, upstream, rate-limit,
  // missing key) we render an indistinguishable "corrupt-receive" failure
  // so the safety boundary is invisible to a probing receiver.

  async function runSuccess(userText, isFollowUp) {
    await respondAnimateBarTo(72, 900 + Math.random() * 500, "TRANSMITTING...");

    // The full conversation rides on every successful turn so the impostor
    // remembers what's already been said. We send the prior turns ONLY (the
    // current user message is the trailing payload).
    const history = isFollowUp ? (respondState.conversation || []).slice(-6) : [];

    let payload = null;
    try {
      const res = await fetch("/api/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          receiverName: respondReceiverName || "",
          connectedName: isFollowUp ? (respondState.connectedName || null) : null,
          history: history,
          usedNames:  respondState.usedNames  || [],
          usedTopics: respondState.usedTopics || [],
          tid: respondState.tid
        })
      });
      if (!res.ok) throw new Error("api " + res.status);
      payload = await res.json();
      if (!payload || !payload.reply || !payload.name) {
        throw new Error("api: malformed");
      }
    } catch (err) {
      console.warn("[respond] api degraded, falling back to corrupt:", err && err.message);
      await respondAnimateBarTo(100, 350, "TRANSMITTING...");
      respondBarSet("fail-stall", "REPLY CORRUPTED · UNREADABLE", 100);
      await wait(900);
      return {
        success: false,
        entry: {
          meta: "REPLY RECEIVED · CORRUPTED",
          kind: "fail",
          text: "→ ░░ ?? █▒░ R▚CV F▞IL · SIGNAL LOST"
        }
      };
    }

    await respondAnimateBarTo(100, 350, "TRANSMITTING...");
    respondBarSet("success", "REPLY RECEIVED", 100);

    if (payload.name && respondState.usedNames.indexOf(payload.name) === -1) {
      respondState.usedNames.push(payload.name);
    }
    if (payload.topic && respondState.usedTopics.indexOf(payload.topic) === -1) {
      respondState.usedTopics.push(payload.topic);
    }

    // Append the just-completed exchange to the conversation buffer so the
    // next follow-up call carries the entire back-and-forth as context.
    if (!Array.isArray(respondState.conversation)) respondState.conversation = [];
    respondState.conversation.push({ role: "user",      content: userText });
    respondState.conversation.push({ role: "assistant", content: payload.reply });
    // Cap the buffer (defense — should already be small given FOLLOW_MAX = 2).
    if (respondState.conversation.length > 12) {
      respondState.conversation = respondState.conversation.slice(-12);
    }

    return {
      success: true,
      name: payload.name,
      entry: {
        meta: "664.LOMITA.CT.94305 / " + payload.name.toUpperCase(),
        kind: "recv",
        text: payload.reply
      }
    };
  }

  // -- typewrite a recv entry into the live log -----------------------

  function respondTypewriteEntry(domHandle, text) {
    return new Promise((resolve) => {
      if (!domHandle || !domHandle.body) { resolve(); return; }
      if (PREFERS_REDUCED_MOTION) {
        domHandle.body.textContent = text;
        resolve();
        return;
      }
      let i = 0;
      domHandle.body.textContent = "";
      function step() {
        if (i >= text.length) { resolve(); return; }
        domHandle.body.textContent += text.charAt(i);
        i++;
        setTimeout(step, RESPOND_TYPE_MS);
      }
      step();
    });
  }

  // -- main submit handler --------------------------------------------

  async function respondHandleSubmit(e) {
    if (e) e.preventDefault();
    if (respondInFlight || respondIsClosed() || !respondState) return;
    if (!respondHandleSet()) {
      respondHandleEl?.focus();
      respondHandleEl?.classList.add("respond__handle--err");
      setTimeout(() => respondHandleEl?.classList.remove("respond__handle--err"), 800);
      return;
    }

    const userText = (respondInputEl?.value || "").trim().slice(0, 140);
    if (userText.length === 0) {
      respondInputEl?.focus();
      return;
    }

    respondInFlight = true;
    if (respondInputEl) respondInputEl.disabled = true;
    if (respondSendEl)  respondSendEl.disabled  = true;

    respondPushLog(
      { meta: "› " + (respondReceiverName || "YOU").toUpperCase(), kind: "sent", text: userText },
      { instant: true }
    );

    if (respondInputEl) respondInputEl.value = "";
    respondUpdateCounter();

    const phase = respondPhase();
    const isFollowUp = phase === "connected";

    // Tally the attempt counter for this phase. We commit BEFORE rolling so a
    // crash mid-roll doesn't grant an infinite retry.
    if (isFollowUp) {
      respondState.followAttempts += 1;
    } else {
      respondState.firstAttempts += 1;
    }
    respondSaveState();
    respondRenderAttemptsCounter();

    // QA forcing.
    const params = new URLSearchParams(window.location.search);
    const forceMode = params.get("force"); // "success"
    const forceFail = params.get("fail");  // mid-stall|no-carrier|ghost|corrupt

    let succeeded;
    let forcedFailMode = forceFail || null;

    if (forceMode === "success") {
      succeeded = true;
    } else if (forceFail) {
      succeeded = false;
    } else if (isFollowUp) {
      // Final follow-up is a guaranteed fail (LLM-drift cap).
      if (respondState.followAttempts >= FOLLOW_MAX) {
        succeeded = false;
      } else {
        succeeded = Math.random() < FOLLOW_RATE;
      }
    } else {
      succeeded = Math.random() < FIRST_RATE;
    }

    respondBarSet("sending", isFollowUp ? "TRANSMITTING REPLY..." : "ESTABLISHING UPLINK...", 0);

    try {
      if (succeeded) {
        const result = await runSuccess(userText, isFollowUp);
        if (result.success) {
          const handle = respondPushLog(result.entry, { instant: false });
          await respondTypewriteEntry(handle, result.entry.text);
          if (!isFollowUp) {
            // First contact achieved — pin the connected name and pivot into
            // follow-up phase. Subsequent sends will reuse the same KA voice.
            respondState.phase = "connected";
            respondState.connectedName = result.name;
            respondSaveState();
          }
        } else {
          // API degraded — render the corrupt-receive entry but DO NOT promote
          // to connected phase. Burns the attempt though (already incremented).
          respondPushLog(result.entry, { instant: true });
        }
      } else {
        const modeId = pickFailMode(forcedFailMode);
        const failEntry = await runFailMode(modeId);
        respondPushLog(failEntry, { instant: true });
      }
    } catch (err) {
      console.error("[respond] unexpected error:", err);
      respondPushLog(
        { meta: "FAILED · UNKNOWN ERROR", kind: "fail", text: "→ TRANSMISSION FAILED. UNKNOWN." },
        { instant: true }
      );
    }

    // Phase transition at the END so the post-event UI matches the new state.
    if (respondState.phase === "first" && respondState.firstAttempts >= FIRST_MAX) {
      respondState.phase = "closed";
    } else if (respondState.phase === "connected" && respondState.followAttempts >= FOLLOW_MAX) {
      respondState.phase = "closed";
    }
    respondSaveState();

    await wait(900);
    respondBarHide();

    respondInFlight = false;
    respondRenderAttemptsCounter();
    respondApplyChannelState();
  }

  // -- handle (receiver name) --------------------------------------------
  // No explicit lock-in button: as the receiver types their name, we sanitize
  // and persist it on every keystroke, then re-derive the channel-enabled
  // state. Once the cleaned value crosses HANDLE_MIN_LEN, the textarea +
  // TRANSMIT button unlock automatically.

  function respondOnHandleInput() {
    if (!respondHandleEl) return;
    const cleaned = sanitizeHandle(respondHandleEl.value);
    respondReceiverName = cleaned.length >= HANDLE_MIN_LEN ? cleaned : null;
    respondSaveReceiverName(respondReceiverName);
    respondApplyChannelState();
  }

  function respondInit() {
    if (!respondFormEl) return;

    respondReceiverName = respondLoadReceiverName();
    if (respondHandleEl && respondReceiverName) {
      respondHandleEl.value = respondReceiverName;
    }

    respondFormEl.addEventListener("submit", respondHandleSubmit);

    if (respondHandleEl) {
      respondHandleEl.addEventListener("input", respondOnHandleInput);
      respondHandleEl.addEventListener("blur", respondOnHandleInput);
      respondHandleEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          respondOnHandleInput();
          if (respondHandleSet()) respondInputEl?.focus();
        }
      });
    }

    if (respondInputEl) {
      respondInputEl.addEventListener("input", respondUpdateCounter);
      respondInputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          respondHandleSubmit(e);
        }
      });
    }

    respondEl?.addEventListener("click", (e) => e.stopPropagation());
  }

  // ---------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------

  async function init() {
    const now = new Date();
    const overrideId = getOverrideId();
    const initial = overrideId
      ? TRANSMISSIONS.find((t) => t.id === overrideId)
      : getCurrentTransmission(now);

    tickCountdown();
    tickAmbient();
    tickSignalStatus();
    buildSignalLog();

    setInterval(tickCountdown, 1000);
    setInterval(tickAmbient, 30000);
    setInterval(tickSignalStatus, 60000);

    signalLogToggleEl.addEventListener("click", toggleSignalLog);

    respondInit();

    document.addEventListener(
      "click",
      (e) => {
        if (e.target.closest(".signal-log")) return;
        if (e.target.closest(".respond")) return;
        if (window.__skipBoot) {
          window.__skipBoot();
        }
        if (window.__skipTypewriter) {
          window.__skipTypewriter();
          window.__skipTypewriter = null;
        }
      },
      { passive: true }
    );

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") {
        if (activeGlitchTimer) {
          clearTimeout(activeGlitchTimer);
          activeGlitchTimer = null;
        }
        clearGlitches();
        return;
      }
      const live = getCurrentTransmission(new Date());
      if (live && live.id !== currentRenderedId && !overrideId) {
        renderTransmission(live, { instant: true });
        buildSignalLog();
      }
      if (!activeGlitchTimer) scheduleNextGlitch(2500, 5000);
    });

    if (shouldRunBoot()) {
      if (transmissionEl) transmissionEl.dataset.hidden = "true";
      if (rationsSectionEl) rationsSectionEl.dataset.hidden = "true";
      try {
        await runBoot();
      } catch (_) {
        skipBoot();
      }
      markBooted();
    } else {
      if (transmissionEl) transmissionEl.dataset.hidden = "false";
      if (rationsSectionEl) rationsSectionEl.dataset.hidden = "false";
    }

    renderTransmission(initial);
    startGlitchLoop();

    const debugGlitch = new URLSearchParams(window.location.search).get("glitch");
    if (debugGlitch) {
      setTimeout(() => window.__glitch(debugGlitch), 600);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
