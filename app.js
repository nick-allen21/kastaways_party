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
    { label: "LOCKING SOURCE: KA-026",     barMs: 750 },
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
    }, 200);
  }

  function fireGlitchSlip() {
    if (!terminalEl) return;
    terminalEl.dataset.glitch = "slip";
    setTimeout(() => {
      if (terminalEl && terminalEl.dataset.glitch === "slip") delete terminalEl.dataset.glitch;
    }, 180);
  }

  function fireGlitchLoss() {
    if (!signalLossEl) return;
    signalLossEl.dataset.active = "false";
    void signalLossEl.offsetWidth;
    signalLossEl.dataset.active = "true";
    setTimeout(() => {
      if (signalLossEl) signalLossEl.dataset.active = "false";
    }, 150);
  }

  function fireGlitchStutter() {
    fireGlitchRgb();
    setTimeout(fireGlitchSlip, 90);
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
      scheduleNextGlitch(8000, 22000);
    }, wait);
  }

  function startGlitchLoop() {
    if (PREFERS_REDUCED_MOTION) return;
    scheduleNextGlitch(3500, 6500);
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

    document.addEventListener(
      "click",
      (e) => {
        if (e.target.closest(".signal-log")) return;
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
      if (!activeGlitchTimer) scheduleNextGlitch(4000, 8000);
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
