(function () {
  "use strict";

  const TRANSMISSIONS = window.TRANSMISSIONS || [];
  const ANCHORS = window.SIGNAL_ANCHORS || {};

  const SIGNAL_TERMINATED = new Date(ANCHORS.signalTerminated);

  // ---- Config ----
  const TYPEWRITER_DEFAULT_MS = 28;
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
  const daysCounterEl = $("days-counter");
  const signalStatusEl = $("signal-status");
  const signalDotEl = $("signal-dot");
  const signalStatusLabelEl = $("signal-status-label");
  const signalLogEl = $("signal-log");
  const signalLogToggleEl = $("signal-log-toggle");
  const signalLogListEl = $("signal-log-list");
  const signalLogCountEl = $("signal-log-count");
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
  const ctaRescueEl      = $("cta-rescue");

  // v21 — KARAIDER INTERCEPT overlay refs
  const hijackFlashEl     = $("hijack-flash");
  const hijackTitleEl     = $("hijack-flash-title");
  const hijackSubEl       = $("hijack-flash-sub");
  const hijackBarsEl      = $("hijack-flash-bars");
  const hijackSpinnersEl  = $("hijack-flash-spinners");

  // ---- State ----
  let activeTypewriterTimer = null;
  let currentRenderedId = null;
  let activeBootTimer = null;
  let activeBootPhaseResolver = null;
  let bootSkipped = false;
  let activeGlitchTimer = null;
  // True while the transmission body is mid-typewriter (or hasn't started
  // rendering yet). The respond form stays locked during this window so a
  // panicked user can't type a name and fire a reply before they've
  // actually read the message. Default true → form stays locked from
  // script load until the first transmission render finishes.
  let transmissionTyping = true;

  // v21 — KARAIDER INTERCEPT state
  // hijackActive: once set true, the UI is permanently in hostile-broadcast
  //   mode for the rest of the session (until refresh). Red palette, faster
  //   glitches, screen shake.
  // hijackReplyConsumed: gates the single allowed reply during/after the
  //   takeover. After the user spends it, any further submit is no-op'd
  //   into channel-closed.
  let hijackActive = false;
  let hijackReplyConsumed = false;

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

  function updateCtaForTransmission(transmission) {
    if (!ctaRescueEl || !transmission) return;
    const isInvitationPhase = ["T4", "T5", "T6"].includes(transmission.id);
    ctaRescueEl.textContent = isInvitationPhase ? "[ COME JOIN US ]" : "[ COME SAVE US ]";
    ctaRescueEl.setAttribute(
      "aria-label",
      isInvitationPhase ? "Come join us — RSVP on Partiful" : "Come save us — RSVP on Partiful"
    );
  }

  function updatePartyMode(transmission) {
    if (!document.body || !transmission) return;

    // T6 is no longer an SOS. Once the Final Bash has started, the whole
    // terminal shifts from distress-signal green into a brighter party signal.
    // Date-based activation keeps party mode alive even if the user browses
    // older transmissions from the signal log; ?t=6 also previews it for QA.
    const finalBashIsLive = new Date() >= SIGNAL_TERMINATED;
    const isFinalBash = transmission.id === "T6" || finalBashIsLive;
    if (isFinalBash) {
      document.body.dataset.partyMode = "final-bash";
    } else {
      delete document.body.dataset.partyMode;
    }
  }

  async function renderTransmission(transmission, opts) {
    opts = opts || {};
    const forceInstant = !!opts.instant;

    headerEl.textContent = transmission.header;
    updateCtaForTransmission(transmission);
    updatePartyMode(transmission);

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

    const shouldType =
      !forceInstant &&
      !PREFERS_REDUCED_MOTION &&
      !hasBeenSeen(transmission.id);

    // Initialize respondState for this transmission BEFORE the typewriter
    // runs. The hijack takeover (v21) can interrupt the typewriter and
    // hijack the channel; if we waited until after typewrite to set up
    // respondState, the hijack reply path would land with respondState ===
    // null and the submit handler would short-circuit.
    if (respondActiveTid !== transmission.id) {
      respondResetForTransmission(transmission.id);
    }

    // Lock the reply form for the duration of the typewriter — including
    // the name input — so the user has to actually read what KA is saying
    // before they can write back. Instant renders flip the lock off
    // immediately (nothing to wait for).
    transmissionTyping = true;
    respondApplyChannelState();

    try {
      if (shouldType) {
        await typewrite(textNode, transmission.body, {
          defaultMs: TYPEWRITER_DEFAULT_MS,
          pacing: transmission.pacing || {}
        });
      } else {
        textNode.textContent = transmission.body;
      }
    } finally {
      transmissionTyping = false;
    }

    markSeen(transmission.id);
    currentRenderedId = transmission.id;

    // Same transmission already loaded → re-evaluate channel state so the
    // typing-lock gets cleared once the typewriter finishes.
    respondApplyChannelState();

    // Throb the reply panel to nudge the user toward the form. User testing
    // had people miss the TRANSMIT REPLY block entirely, so we fire a
    // breathing pulse the moment the body finishes typing. The damp
    // listeners in respondInit() clear data-throb on the first interaction
    // (NAME tap, textarea focus, send press). Skip when the channel is
    // already closed for this transmission — there's no form to throb.
    if (respondEl && respondPhase() !== "closed") {
      respondEl.dataset.throb = "true";
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

  function tickAmbient() {
    // DAY counter tracks the active transmission index (T1 -> DAY 01, ..., T6 -> DAY 06)
    // not calendar days, so the label flips at midnight when the transmission flips.
    const now = new Date();
    const current = getCurrentTransmission(now);
    const day = current ? TRANSMISSIONS.indexOf(current) + 1 : 1;
    if (daysCounterEl) {
      daysCounterEl.textContent = "DAY " + pad(day) + " SINCE WRECK";
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

  // Hidden reset gesture: triple-tap the SIGNAL STATUS pill within
  // SIGNAL_RESET_WINDOW_MS to wipe persisted state and reload. Useful both as
  // an in-character easter egg ("the signal blinks back to life") and as the
  // simplest way for QA / partygoers to retry a transmission without resorting
  // to devtools or URL params.
  const SIGNAL_RESET_WINDOW_MS = 3000;
  const SIGNAL_RESET_TARGET    = 3;
  const SIGNAL_TAP_FLICKER_MS  = 240;
  let signalResetTaps = 0;
  let signalResetTimer = null;

  function flickerSignalDot() {
    if (!signalDotEl) return;
    signalDotEl.classList.remove("dot--tap");
    // Force reflow so re-adding the class restarts the keyframe animation
    // even on rapid successive taps.
    void signalDotEl.offsetWidth;
    signalDotEl.classList.add("dot--tap");
    setTimeout(() => signalDotEl.classList.remove("dot--tap"), SIGNAL_TAP_FLICKER_MS + 20);
  }

  function performSignalReset() {
    try {
      localStorage.removeItem(RESPOND_LS_KEY);
      localStorage.removeItem(RECEIVER_LS_KEY);
      localStorage.removeItem(NAME_LOCKED_LS_KEY);
    } catch (_) { /* noop */ }
    try {
      delete document.body.dataset.mode;
      delete document.body.dataset.partyMode;
    } catch (_) { /* noop */ }
    location.reload();
  }

  function wireSignalResetTap() {
    if (!signalStatusEl) return;
    signalStatusEl.addEventListener("click", (e) => {
      // Don't let the tap also fire the document-level skip-typewriter /
      // skip-boot handler. The reset gesture is its own affordance.
      e.stopPropagation();

      flickerSignalDot();
      signalResetTaps += 1;

      clearTimeout(signalResetTimer);
      signalResetTimer = setTimeout(() => { signalResetTaps = 0; }, SIGNAL_RESET_WINDOW_MS);

      if (signalResetTaps >= SIGNAL_RESET_TARGET) {
        signalResetTaps = 0;
        clearTimeout(signalResetTimer);
        performSignalReset();
      }
    });
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
  // v21 — KARAIDER INTERCEPT
  // ---------------------------------------------------------------
  // Hidden easter egg. Server-side `/api/respond` returns
  // `{ intercept: { mode, variant?, line? } }` when one of four trigger
  // vectors fires (magic phrase, ≥3 raider mentions, 1-4am PT, or party
  // window). On `mode:"full"` we run the 5-second hijack flash, swap the
  // entire UI to red, typewriter the karaider's monologue + ASCII map,
  // and allow exactly one final reply (which the karaider hard-fails
  // with a hardcoded threat). `mode:"rare"` is the 5% one-line stinger
  // and just closes the channel without the full takeover.
  //
  // All in-character copy lives client-side: the server only decides
  // whether an intercept fires and which variant.

  const HIJACK_FLASH_MS = 5000;
  const HIJACK_GLITCH_MIN_MS = 800;
  const HIJACK_GLITCH_MAX_MS = 1400;

  // Bird's-eye treasure map. Pure ASCII (no unicode box-drawing) so VT323
  // renders consistent character widths across the board.
  const KARAIDER_MAP_ASCII = [
    "                N",
    "                ^",
    "      +-----------------+",
    "      |   ..  PALMS  .. |",
    "      |                 |",
    "      |    ##########   |",
    "      |    ##  [X]  ##  |  <- \"stage\"",
    "      |    ##       ##  |",
    "      |    ##       ##  |",
    "      |    ##       ##  |",
    "      |    ##       ##  |",
    "      |    ##########   |",
    "      |                 |",
    "      |    entrance     |",
    "      +-----------------+"
  ].join("\n");

  const KARAIDER_MONOLOGUE_DEFAULT = [
    "[ INTERCEPT // UNKNOWN BROADCAST ]",
    "",
    "> WE'VE BEEN HEARING YOU.",
    "",
    "we are still here.",
    "we've been here for years.",
    "",
    "we crashed on this island. just like them.",
    "we screamed for help into the same dead air.",
    "no one came.",
    "we had to learn to survive in this place",
    "",
    "then their ship came down.",
    "their wreck landed on top of our buried treasure.",
    "on top of what is ours.",

    "AND NOW YOU WANT TO COME HELP??!?!",
    "AFTER ALL THESE YEARS YOU COME TO HELP THEM!!??!??",

    "we will fight for anything to get it back.",
    "do not. come. to. this. island.",
    "",
    "[ TREASURE MAP // KA ISLAND ]",
    "",
    KARAIDER_MAP_ASCII,
    "",
    "X = the chest. under their \"stage\".",
    "if you come — you will meet the same fate.",
    "the treasure is ours by right.",
    "",
    "[ END BROADCAST // DO NOT TRANSMIT BACK ]"
  ].join("\n");

  // Variant fired during 5/2 14:00–19:00 PT. Same intro, present-tense
  // closing because the party is happening NOW on top of the treasure.
  const KARAIDER_MONOLOGUE_PARTY = [
    "[ INTERCEPT // UNKNOWN BROADCAST ]",
    "",
    "> WE HEAR THE BASS THROUGH THE EARTH.",
    "",
    "we are still here.",
    "we've been here for years.",
    "",
    "we crashed on this island. just like them.",
    "we screamed for help into the same dead air.",
    "no one came.",
    "",
    "their wreck landed on top of our buried treasure.",
    "on top of what is ours.",
    "",
    "and now they DARE.",
    "they DRINK on top of it.",
    "they THROW A PARTY on top of it.",
    "right now. while we LISTEN.",
    "",
    "AND NOW AFTER ALL THIS TIME YOU CHOOSE TO COME",
    "AFTER SHOWING US YEARS OF SILENCE YOU COME NOW!!??!?!",
    "",
    "we will show. we will show you.",
    "",
    "[ TREASURE MAP // KA ISLAND ]",
    "",
    KARAIDER_MAP_ASCII,
    "",
    "X = the chest. under their \"stage\".",
    "we are coming for it tonight.",
    "the treasure is ours by right.",
    "",
    "[ END BROADCAST // DO NOT TRANSMIT BACK ]"
  ].join("\n");

  // The single allowed reply during full takeover always returns one of
  // these. Hardcoded — never an LLM call — so the karaider voice can
  // never drift. Pirate-toned (no eating-people imagery — they're
  // marooned plunderers, not cannibals).
  const KARAIDER_REPLY_LINES = [
    "STOP TRANSMITTING.",
    "WE DO NOT NEGOTIATE.",
    "WE ARE ALREADY ON THE BEACH."
  ];

  function pickRandomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // -- Client-side intercept eligibility -----------------------------------
  //
  // The server is the source of truth for whether an intercept fires, but
  // since the existing flow only calls /api/respond when the client's
  // success roll comes back true, a deterministic intercept (magic phrase
  // on first turn, ≥3 raider mentions, 1-4am PT, party window) could be
  // silently lost on a failed roll. Mirror those four checks here so we
  // can force `succeeded = true` on any turn that's intercept-eligible.
  // The server still re-runs the same checks and is the actual decider —
  // this is purely a "make sure the request reaches the server" gate.
  // Vector B (5% rare roll) intentionally stays server-side only.

  // Generous spelling tolerance: `k?a?raider` matches raider / kraider /
  // araider / karaider so common typos (`KrAiders`, `Karaider`, etc.) all
  // count. The earlier `(ka)?raider` form silently dropped `Kraider`.
  // Mirrors api/_data/karaider.js — keep them in sync.
  const HIJACK_RAIDER_TOKEN = "k?a?raider";
  const HIJACK_MAGIC_PATTERNS = [
    new RegExp("(let|put|switch|connect|tune|patch).{0,20}(me|us)?.{0,20}(to|with|through|onto).{0,30}(the )?(" + HIJACK_RAIDER_TOKEN + ")", "i"),
    new RegExp("(" + HIJACK_RAIDER_TOKEN + ")s?.{0,20}\\b(i|we)\\b.{0,10}(want|need|gotta|wanna).{0,10}(to )?(talk|speak|hear)", "i"),
    new RegExp("(talk|speak)\\s+(to|with)\\s+(the\\s+)?(" + HIJACK_RAIDER_TOKEN + ")", "i"),
    new RegExp("^[\\s>\"'-]*(hey\\s+|yo\\s+|sup\\s+)?(" + HIJACK_RAIDER_TOKEN + ")s?\\b", "i"),
    new RegExp("\\b(open|hail|raise)\\s+(the\\s+)?(" + HIJACK_RAIDER_TOKEN + ")", "i")
  ];
  const HIJACK_MENTION_RE = new RegExp(
    "\\b(" + HIJACK_RAIDER_TOKEN + "s?|the others|who else|who('?s| is) out there|hostile[s]?|enemies|enemy|other survivors?|who attacked)\\b",
    "i"
  );

  function hijackTripsMagicPhrase(text) {
    if (!text) return false;
    return HIJACK_MAGIC_PATTERNS.some((re) => re.test(text));
  }

  function hijackCountRaiderMentions(currentMessage) {
    let n = 0;
    if (respondState && Array.isArray(respondState.conversation)) {
      for (const m of respondState.conversation) {
        if (m && m.role === "user" && typeof m.content === "string") {
          const matches = m.content.match(new RegExp(HIJACK_MENTION_RE.source, "gi"));
          if (matches) n += matches.length;
        }
      }
    }
    if (typeof currentMessage === "string") {
      const matches = currentMessage.match(new RegExp(HIJACK_MENTION_RE.source, "gi"));
      if (matches) n += matches.length;
    }
    return n;
  }

  function hijackPTHour() {
    try {
      const fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Los_Angeles",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", hour12: false
      });
      const parts = fmt.formatToParts(new Date()).reduce((acc, p) => {
        if (p.type !== "literal") acc[p.type] = p.value;
        return acc;
      }, {});
      return {
        year:  Number(parts.year),
        month: Number(parts.month),
        day:   Number(parts.day),
        hour:  Number(parts.hour) % 24
      };
    } catch (_) {
      return null;
    }
  }

  function hijackInAtmosphericWindow(pt) {
    return pt && pt.hour >= 1 && pt.hour < 5;
  }

  function hijackInPartyWindow(pt) {
    return pt && pt.year === 2026 && pt.month === 5 && pt.day === 2 &&
           pt.hour >= 14 && pt.hour < 19;
  }

  // Returns true if this submit should ALWAYS reach the server (so a
  // server-side intercept gets a chance to fire). False otherwise — the
  // existing client-side success roll governs whether the API gets hit.
  function hijackInterceptEligible(userText, isFollowUp) {
    if (hijackActive) return false; // takeover already happened
    const pt = hijackPTHour();
    if (hijackInAtmosphericWindow(pt)) return true;
    if (hijackInPartyWindow(pt))       return true;
    // Magic phrase only counts on the very first turn of a conversation,
    // mirroring the server's `isFirstTurn` check.
    if (!isFollowUp && hijackTripsMagicPhrase(userText)) return true;
    if (hijackCountRaiderMentions(userText) >= 3)        return true;
    return false;
  }

  // -- Hijack overlay choreography -----------------------------------------

  // Build the four loading bars and two spinners inside the overlay. Bars
  // come in differing forms so the screen feels like several systems are
  // being breached in parallel.
  function hijackPopulateOverlay() {
    if (!hijackBarsEl || !hijackSpinnersEl) return;

    const barSpecs = [
      { label: "INJECTING SIGNAL...",       ms: 4400, delay:  100 },
      { label: "OVERRIDING FREQUENCY...",   ms: 3700, delay:  500 },
      { label: "LOCATING SOURCE...",        ms: 4900, delay:  300 },
      { label: "PURGING KAPPA ALPHA...",    ms: 4200, delay:  900 }
    ];

    hijackBarsEl.innerHTML = "";
    barSpecs.forEach((spec) => {
      const wrap = document.createElement("div");
      wrap.className = "hijack-flash__bar";

      const lbl = document.createElement("div");
      lbl.textContent = "> " + spec.label;
      wrap.appendChild(lbl);

      const track = document.createElement("div");
      track.className = "hijack-flash__bar-track";
      const fill = document.createElement("div");
      fill.className = "hijack-flash__bar-fill";
      fill.style.setProperty("--bar-ms",    spec.ms + "ms");
      fill.style.setProperty("--bar-delay", spec.delay + "ms");
      track.appendChild(fill);
      wrap.appendChild(track);

      hijackBarsEl.appendChild(wrap);
    });

    const spinSpecs = [
      { label: "DECRYPTING", style: "cw-fast" },
      { label: "BREACHING",  style: "ccw-slow" }
    ];

    hijackSpinnersEl.innerHTML = "";
    spinSpecs.forEach((spec) => {
      const wrap = document.createElement("div");
      wrap.className = "hijack-flash__spinner";

      const disc = document.createElement("div");
      disc.className = "hijack-flash__spinner-disc";
      disc.dataset.style = spec.style;
      wrap.appendChild(disc);

      const lbl = document.createElement("div");
      lbl.textContent = spec.label;
      wrap.appendChild(lbl);

      hijackSpinnersEl.appendChild(wrap);
    });
  }

  function hijackShowOverlay() {
    if (!hijackFlashEl) return;
    hijackPopulateOverlay();
    hijackFlashEl.hidden = false;
  }

  function hijackHideOverlay() {
    if (!hijackFlashEl) return;
    hijackFlashEl.hidden = true;
    if (hijackBarsEl)     hijackBarsEl.innerHTML = "";
    if (hijackSpinnersEl) hijackSpinnersEl.innerHTML = "";
  }

  // Slot the takeover into the existing periodic-glitch loop: cancel the
  // current schedule, then restart it with a much tighter cadence so
  // shakes/flashes happen ~1Hz for the rest of the session.
  function hijackRevvedGlitchLoop() {
    if (PREFERS_REDUCED_MOTION) return;
    if (activeGlitchTimer) {
      clearTimeout(activeGlitchTimer);
      activeGlitchTimer = null;
    }
    function tick() {
      if (document.visibilityState === "visible") {
        fireRandomGlitch();
      }
      const wait = HIJACK_GLITCH_MIN_MS + Math.random() * (HIJACK_GLITCH_MAX_MS - HIJACK_GLITCH_MIN_MS);
      activeGlitchTimer = setTimeout(tick, wait);
    }
    activeGlitchTimer = setTimeout(tick, 600);
  }

  // -- Full takeover (Vectors A1, A2, C, D) --------------------------------

  async function runHijackTakeover(variant) {
    if (hijackActive) return; // second call is a no-op

    hijackActive = true;
    hijackReplyConsumed = false;

    // Body data-mode swaps the green tokens to red across the entire UI
    // via CSS variable rebind. Set BEFORE the overlay appears so the
    // re-skin lands at the same instant as the flash.
    document.body.dataset.mode = "hijack";

    // Lock the form for the full hijack window — flash + monologue type.
    transmissionTyping = true;
    respondApplyChannelState();

    // Show the 5-second hijack-flash overlay (loading bars + spinners).
    hijackShowOverlay();
    await wait(HIJACK_FLASH_MS);
    hijackHideOverlay();

    // Replace the transmission header so the receiver sees an unknown
    // source has taken the band. We deliberately HIDE the corner stamp
    // here — early QA had a "BAND COMPROMISED" stamp slapped over the
    // header, but it covered up the new "INTERCEPT // SOURCE UNKNOWN"
    // line and read as a UI bug rather than narrative. The header alone
    // does the storytelling now.
    if (headerEl) headerEl.textContent = "INTERCEPT // SOURCE UNKNOWN";
    if (stampEl) {
      stampEl.hidden = true;
      stampEl.textContent = "";
    }

    // Wipe the existing transmission body and typewriter the monologue
    // into it so the takeover replaces what KA was just saying.
    if (bodyEl) {
      bodyEl.innerHTML = "";
      const textNode = document.createElement("span");
      bodyEl.appendChild(textNode);
      if (cursorEl) {
        cursorEl.dataset.hidden = "false";
        cursorEl.dataset.paused = "false";
        bodyEl.appendChild(cursorEl);
      }

      const text = variant === "party"
        ? KARAIDER_MONOLOGUE_PARTY
        : KARAIDER_MONOLOGUE_DEFAULT;

      // Honor reduced-motion + a ?fast=1 QA hook by rendering instantly.
      // Background tabs throttle setTimeout to ~1Hz which would stretch
      // the typewriter into minutes; instant render avoids that gotcha
      // while still preserving the reveal beat.
      const fastQA = new URLSearchParams(window.location.search).get("fast") === "1";
      if (PREFERS_REDUCED_MOTION || fastQA) {
        textNode.textContent = text;
      } else {
        try {
          await typewrite(textNode, text, { defaultMs: 12 });
        } catch (_) { /* swallow */ }
      }
    }

    // Crank the periodic glitch loop to ~1Hz so the screen never settles.
    hijackRevvedGlitchLoop();

    // Unlock the form for the single allowed reply. The submit handler
    // intercepts the next send via hijackActive + !hijackReplyConsumed.
    transmissionTyping = false;
    respondInFlight = false;
    respondApplyChannelState();

    // Pulse the panel red (var swap re-tints the throb glow automatically)
    // so the receiver knows they have one shot to talk back to the karaider.
    if (respondEl) respondEl.dataset.throb = "true";
  }

  // -- Rare interception (Vector B) ----------------------------------------

  async function runRareIntercept(line) {
    // Brief 600ms red wash on the topbar — no full takeover.
    if (document.body.dataset.mode !== "hijack") {
      document.body.dataset.mode = "hijack-mini";
      setTimeout(() => {
        if (document.body.dataset.mode === "hijack-mini") {
          delete document.body.dataset.mode;
        }
      }, 700);
    }

    // Append the stinger as an intercept entry in the respond log so it
    // sits where the real reply would have appeared.
    const entry = {
      meta: "INTERCEPT // SOURCE UNKNOWN",
      kind: "fail",
      text: line || "INTERFERENCE — UNKNOWN BROADCAST"
    };
    respondPushLog(entry, { instant: true });

    // Channel closes immediately — no retry until the next signal drop.
    if (respondState) {
      respondState.phase = "closed";
      respondSaveState();
    }

    await wait(900);
    respondBarHide();
    respondInFlight = false;
    respondApplyChannelState();
  }

  // -- One-and-only reply during full takeover -----------------------------

  async function hijackHandleReply(userText) {
    hijackReplyConsumed = true;

    // Render the receiver's send line into the log.
    respondPushLog(
      { meta: "› " + (respondReceiverName || "YOU").toUpperCase(), kind: "sent", text: userText },
      { instant: true }
    );

    // Quick fake "transmitting" beat so the user sees their packet leave.
    respondBarSet("sending", "TRANSMITTING TO 664.LOMITA.CT.94305...", 0);
    await respondAnimateBarTo(95, 800, "TRANSMITTING...");
    respondBarSet("fail-no-carrier", "INTERCEPTED // ROUTE HIJACKED", 100);
    await wait(700);

    // Karaider's hardcoded threat. Random of three. Never an LLM call.
    const threat = pickRandomFrom(KARAIDER_REPLY_LINES);
    const handle = respondPushLog(
      {
        meta: "INTERCEPT // KARAIDER",
        kind: "fail",
        text: threat
      },
      { instant: false }
    );
    await respondTypewriteEntry(handle, threat);

    // Channel closes. Closed banner reads "TRANSMISSION ENDED // DO NOT
    // TRANSMIT BACK" — see hijackUpdateClosedBanner below.
    if (respondState) {
      respondState.phase = "closed";
      respondSaveState();
    }
    hijackUpdateClosedBanner();

    await wait(700);
    respondBarHide();
    respondInFlight = false;
    respondApplyChannelState();
  }

  function hijackUpdateClosedBanner() {
    if (!respondClosedEl) return;
    const title = respondClosedEl.querySelector(".respond__closed-title");
    const sub   = respondClosedEl.querySelector(".respond__closed-sub");
    if (title) title.textContent = "TRANSMISSION ENDED";
    if (sub)   sub.textContent   = "DO NOT TRANSMIT BACK";
  }

  // -- QA: ?intercept=full|party|rare|clear --------------------------------

  function maybeRunInterceptQAHook() {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("intercept");
    if (!mode) return;

    if (mode === "clear") {
      delete document.body.dataset.mode;
      hijackActive = false;
      hijackReplyConsumed = false;
      // QA: also wipe persisted respond/conversation state so a follow-up
      // ?intercept=full|rare|party run starts from a fresh non-closed channel.
      try {
        localStorage.removeItem("respond:v3");
        localStorage.removeItem("respond:receiver");
      } catch (_) { /* noop */ }
      return;
    }

    // Defer until after the initial transmission has rendered so the
    // takeover REPLACES a normal-looking page rather than firing into a
    // blank one. 1.2s gives the typewriter enough headroom on instant
    // re-renders.
    setTimeout(() => {
      if (mode === "full" || mode === "party") {
        runHijackTakeover(mode === "party" ? "party" : "default");
      } else if (mode === "rare") {
        const line = "INTERFERENCE — UNKNOWN BROADCAST: \"if you come you'll meet our same fate.\"";
        // Pretend an in-flight submit just resolved into a rare intercept.
        respondInFlight = true;
        runRareIntercept(line);
      }
    }, 1200);
  }

  // ---------------------------------------------------------------
  // Respond / KA band (v20)
  // ---------------------------------------------------------------
  // Two-phase conversation, hard safety rails server-side. State is per-
  // transmission (resets at midnight when the next T drops); the receiver
  // name is GLOBAL (one entry, persists across all 6 transmissions).
  //
  // Phase A — first contact:
  //   Up to FIRST_MAX send attempts at the active transmission's first-contact
  //   rate. If every roll fails the channel locks for this transmission. On
  //   success, the API picks a KA member + topic and writes back a reply (no
  //   fixed opener — the model just sounds excited the connection worked).
  //
  // Phase B — connected:
  //   The receiver is now talking to the same KA member. Each follow-up rolls
  //   the active transmission's follow-up rate. ANY drop in this phase (random
  //   fail, API-degraded corrupt, or the FOLLOW_MAX hard cap) immediately
  //   severs the channel — no retry until the next transmission drops.
  //   FOLLOW_MAX still acts as an LLM-drift ceiling for lucky streaks.
  //
  // Phase C — closed:
  //   Form hidden, "TRANSMISSION LOST" banner shown. Resets when the
  //   active transmission flips.

  const FIRST_MAX   = 3;             // hard cap on first-contact sends
  const FOLLOW_MAX  = 5;             // hard cap on consecutive successes; the 5th is forced fail
  const RESPOND_RATES = {
    T1: { first: 0.35, follow: 0.50 },
    T2: { first: 0.45, follow: 0.50 },
    T3: { first: 0.50, follow: 0.60 },
    T4: { first: 0.65, follow: 0.60 },
    T5: { first: 0.70, follow: 0.70 },
    T6: { first: 1.00, follow: 1.00 }
  };
  const RESPOND_PLACEHOLDERS = {
    T1: {
      first: "are you guys alive???",
      connected: "where are you? what happened to the krewship?"
    },
    T2: {
      first: "who are the kraiders?",
      connected: "where did they come from?"
    },
    T3: {
      first: "can you hear them in the trees?",
      connected: "are you still holding the line?"
    },
    T4: {
      first: "is it really too late to save you?",
      connected: "how do we come join you?"
    },
    T5: {
      first: "is the final bash really tomorrow?",
      connected: "what songs are you singing?"
    },
    T6: {
      first: "where is the final bash?!? 🎉",
      connected: "save some rum for me!!! 🍹"
    }
  };
  const FAIL_MODES = [
    { id: "mid-stall",     weight: 4 },
    { id: "no-carrier",    weight: 2 },
    { id: "ghost",         weight: 2 },
    { id: "corrupt",       weight: 2 }
  ];
  const FAIL_TOTAL_WEIGHT = FAIL_MODES.reduce((s, m) => s + m.weight, 0);

  const RESPOND_LS_KEY  = "respond:v3";              // state schema (per-transmission)
  const RECEIVER_LS_KEY = "kastaways:receiver_name"; // global, shared across transmissions
  const NAME_LOCKED_LS_KEY = "kastaways:name_locked"; // "1" once the user has submitted their first message — name input then stays hidden forever
  const RESPOND_TYPE_MS = 26;
  const HANDLE_MIN_LEN  = 2;
  const HANDLE_MAX_LEN  = 24;

  let respondActiveTid = null;
  let respondState = null;        // { tid, phase, firstAttempts, followAttempts, connectedName, usedNames, usedTopics, log[] }
  let respondReceiverName = null; // global handle
  let respondInFlight = false;
  let respondBarTimer = null;

  function respondRatesForTid(tid) {
    return RESPOND_RATES[tid] || RESPOND_RATES.T1;
  }

  function respondPlaceholderForPhase(phase) {
    const tid = (respondState && respondState.tid) || respondActiveTid || currentRenderedId || "T1";
    const copy = RESPOND_PLACEHOLDERS[tid] || RESPOND_PLACEHOLDERS.T1;
    return phase === "connected" ? copy.connected : copy.first;
  }

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

  // Once the receiver has submitted their first message, the name input row
  // disappears for good — the value is just used silently from localStorage.
  // The flag is global (persists across all transmissions) so day 2 doesn't
  // re-prompt the user. Returning users on a fresh transmission don't see it.
  function respondNameLocked() {
    try {
      return localStorage.getItem(NAME_LOCKED_LS_KEY) === "1";
    } catch (_) { return false; }
  }

  function respondLockName() {
    try { localStorage.setItem(NAME_LOCKED_LS_KEY, "1"); } catch (_) { /* noop */ }
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
    // vs "TRANSMISSION LOST" (which the closed banner conveys directly).
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
    const nameLocked = respondNameLocked();
    const typing = transmissionTyping;
    const allowSend = !closed && !respondInFlight && nameOk && !typing;

    respondEl.dataset.closed = closed ? "true" : "false";
    respondEl.dataset.phase  = phase;
    respondEl.dataset.handle = nameOk ? "set" : "unset";
    respondEl.dataset.typing = typing ? "true" : "false";
    if (respondClosedEl) respondClosedEl.hidden = !closed;

    // After the first submit the receiver never sees the NAME row again —
    // the persisted handle just rides on every API call silently.
    if (respondHandleRowEl) respondHandleRowEl.hidden = nameLocked;
    // Name input also locks during the typewriter so the user can't
    // pre-fill it before they've finished reading the transmission.
    if (respondHandleEl) respondHandleEl.disabled = typing || closed;

    if (respondInputEl) {
      respondInputEl.disabled = !allowSend;
      if (typing) {
        respondInputEl.placeholder = "stand by · transmission incoming...";
      } else if (!nameOk) {
        respondInputEl.placeholder = "enter your name above first ↑";
      } else {
        respondInputEl.placeholder = respondPlaceholderForPhase(phase);
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
    // For received KA replies, the meta is "664.LOMITA.CT.94305 / KA NAME".
    // Split it into a small/dim prefix and a bigger/bolder name span so the
    // member's broadcast name pops in the log — that's the part receivers
    // actually want to see ("oh, GEORGE WEIKSNER answered"), and at the
    // base 10px meta size it was getting lost. Other kinds keep the flat
    // single-line look so the user's own "› MAYA" line stays compact.
    const metaText = entry.meta || "";
    const slashIdx = entry.kind === "recv" ? metaText.indexOf(" / ") : -1;
    if (slashIdx !== -1) {
      const prefix = document.createElement("span");
      prefix.className = "respond__entry-meta-prefix";
      prefix.textContent = metaText.slice(0, slashIdx + 3);
      meta.appendChild(prefix);

      const name = document.createElement("span");
      name.className = "respond__entry-meta-name";
      name.textContent = metaText.slice(slashIdx + 3);
      meta.appendChild(name);
    } else {
      meta.textContent = metaText;
    }
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
      // v21 — server-side karaider intercept short-circuit. If the response
      // carries an `intercept` field, the LLM was never called and the
      // client owns the entire render path. Bubble a sentinel up to the
      // caller so the normal success/fail accounting is bypassed.
      if (payload && payload.intercept && typeof payload.intercept === "object") {
        return {
          success: false,
          intercept: payload.intercept
        };
      }
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
      const fastQA = new URLSearchParams(window.location.search).get("fast") === "1";
      if (PREFERS_REDUCED_MOTION || fastQA) {
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

    // v21 — if the karaider has already taken over and we're spending the
    // single allowed reply, divert the entire submit into the hardcoded
    // threat path. No API call, no LLM, channel closes after.
    if (hijackActive && !hijackReplyConsumed) {
      if (respondInputEl) respondInputEl.value = "";
      respondUpdateCounter();
      try {
        await hijackHandleReply(userText);
      } catch (err) {
        console.error("[hijack] reply handler failed:", err);
      }
      return;
    }

    respondPushLog(
      { meta: "› " + (respondReceiverName || "YOU").toUpperCase(), kind: "sent", text: userText },
      { instant: true }
    );

    // Lock the name input forever the moment they fire their first message.
    // From here on the receiver name rides on every API call silently and
    // the NAME row stays hidden across reloads + future transmissions.
    if (!respondNameLocked()) {
      respondLockName();
      if (respondHandleRowEl) respondHandleRowEl.hidden = true;
    }

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
    const rates = respondRatesForTid(respondState.tid);

    // v21 — if this turn is intercept-eligible (magic phrase, ≥3 raider
    // mentions, 1-4am PT, or party window) we force success so the API
    // call actually reaches the server, where the canonical intercept
    // decision lives. Without this, a failed client-side roll would
    // silently swallow a deterministic-vector trigger.
    const interceptEligible = hijackInterceptEligible(userText, isFollowUp);

    // QA dev-mode: if the receiver name is exactly "Nick Allen" (case-
    // insensitive), every send connects so the LLM behaviour can be tested
    // end-to-end without grinding through the probability ladder.
    // The 5-message hard cap (FOLLOW_MAX) still applies — Nick gets reliable
    // sends but cannot exceed the LLM-drift ceiling.
    const nickAllenMode = (respondReceiverName || "").trim().toLowerCase() === "nick allen";

    if (forceMode === "success") {
      succeeded = true;
    } else if (forceFail) {
      succeeded = false;
    } else if (interceptEligible) {
      succeeded = true;
    } else if (isFollowUp && respondState.followAttempts >= FOLLOW_MAX) {
      // Hard cap on consecutive follow-ups — applies to everyone, including
      // nickAllenMode, because it's a story/drift constraint not a probability.
      succeeded = false;
    } else if (nickAllenMode) {
      succeeded = true;
    } else if (isFollowUp) {
      succeeded = Math.random() < rates.follow;
    } else {
      succeeded = Math.random() < rates.first;
    }

    respondBarSet("sending", isFollowUp ? "TRANSMITTING REPLY..." : "ESTABLISHING UPLINK...", 0);

    // Track whether we ended this turn with a delivered reply or with any
    // kind of drop. Used below for the connected-phase one-strike rule.
    let dropped = false;

    try {
      if (succeeded) {
        const result = await runSuccess(userText, isFollowUp);
        // v21 — karaider intercept short-circuit. The runSuccess returned
        // an intercept sentinel; hand off to the matching renderer and
        // skip every other branch (no log entry yet — the renderers own
        // their own log/typewriter).
        if (result.intercept) {
          // Hide the in-flight progress bar before the takeover/stinger
          // so it doesn't peek through.
          respondBarHide();
          if (result.intercept.mode === "full") {
            await runHijackTakeover(result.intercept.variant || "default");
            // hijack owns its own state; skip the normal phase transition.
            return;
          }
          if (result.intercept.mode === "rare") {
            await runRareIntercept(result.intercept.line);
            return;
          }
        }
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
          // API degraded — render the corrupt-receive entry. From the
          // receiver's POV this is indistinguishable from a real drop, so
          // it counts as one for the connected-phase one-strike rule.
          respondPushLog(result.entry, { instant: true });
          dropped = true;
        }
      } else {
        const modeId = pickFailMode(forcedFailMode);
        const failEntry = await runFailMode(modeId);
        respondPushLog(failEntry, { instant: true });
        dropped = true;
      }
    } catch (err) {
      console.error("[respond] unexpected error:", err);
      respondPushLog(
        { meta: "FAILED · UNKNOWN ERROR", kind: "fail", text: "→ TRANSMISSION FAILED. UNKNOWN." },
        { instant: true }
      );
      dropped = true;
    }

    // Phase transition at the END so the post-event UI matches the new state.
    //   first → closed: only after FIRST_MAX failed attempts (you get retries).
    //   connected → closed: ANY drop severs the channel for this transmission
    //                       (no retries — try again at the next signal drop).
    //                       FOLLOW_MAX is still a defensive ceiling for lucky
    //                       streaks; the FOLLOW_MAX-th turn is a forced fail
    //                       which trips the same drop branch.
    if (respondState.phase === "first" && respondState.firstAttempts >= FIRST_MAX) {
      respondState.phase = "closed";
    } else if (respondState.phase === "connected" && dropped) {
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

    // Damp the post-typewriter throb on the very first user interaction
    // with the panel. Delegated on .respond so a tap/focus on the NAME
    // input, the textarea, or the [ TRANSMIT ] button all kill the pulse —
    // we don't want it screaming at someone who has clearly engaged.
    if (respondEl) {
      const dampThrob = () => {
        if (respondEl.dataset.throb === "true") {
          respondEl.dataset.throb = "false";
        }
      };
      respondEl.addEventListener("pointerdown", dampThrob);
      respondEl.addEventListener("focusin", dampThrob);
    }

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

    // Sync the form's disabled state to the initial transmissionTyping=true.
    // Until the first transmission render flips that flag, every input is
    // disabled regardless of whether the receiver has a persisted name.
    respondApplyChannelState();
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
    wireSignalResetTap();

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
      try {
        await runBoot();
      } catch (_) {
        skipBoot();
      }
      markBooted();
    } else {
      if (transmissionEl) transmissionEl.dataset.hidden = "false";
    }

    renderTransmission(initial);
    startGlitchLoop();

    const debugGlitch = new URLSearchParams(window.location.search).get("glitch");
    if (debugGlitch) {
      setTimeout(() => window.__glitch(debugGlitch), 600);
    }

    // v21 — ?intercept=full|party|rare|clear forces the takeover for QA
    // without going through the chat flow. Defers until after the initial
    // transmission render so the takeover REPLACES a normal-looking page.
    maybeRunInterceptQAHook();

    // window.__hijack(variant) lets you trigger the takeover from the
    // console for last-mile testing.
    window.__hijack = function (variant) {
      runHijackTakeover(variant === "party" ? "party" : "default");
    };
    window.__rare = function () {
      runRareIntercept(
        "INTERFERENCE — UNKNOWN BROADCAST: \"if you come you'll meet our same fate.\""
      );
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
