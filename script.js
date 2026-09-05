(() => {
  "use strict";

  /* ---------------------------------------------------------------- */
  /* word bank                                                         */
  /* ---------------------------------------------------------------- */

  const WORDS = ("the be to of and a in that have I it for not on with he as you do at "
    + "this but his by from they we say her she or an will my one all would there their "
    + "what so up out if about who get which go me when make can like time no just him "
    + "know take people into year your good some could them see other than then now look "
    + "only come its over think also back after use two how our work first well way even "
    + "new want because any these give day most us is water long find here thing great "
    + "little own under last never world life form still try between small large system "
    + "each next early begin seem country hand light order house point ago area case week "
    + "company where much fact eye month word without govern service story air problem art "
    + "line hold since often build simple learn plant piece song space table travel garden "
    + "river mountain forest ocean cloud stone bridge market corner village castle island "
    + "shadow silence journey mirror candle whisper harbor thunder velvet crystal amber "
    + "meadow lantern compass horizon feather ribbon canyon glacier ember orchard tundra "
    + "quiet spark flame breeze frost gravel pepper cinder maple willow cedar birch coral "
    + "pearl jungle desert valley summit tunnel anchor beacon ripple pulse orbit signal")
    .split(" ").filter(Boolean);

  const QUOTES = [
    "The quiet hum of a keyboard at midnight is its own kind of music, steady and unhurried, carrying thoughts from mind to screen one letter at a time.",
    "A good typist does not chase speed for its own sake, but finds that speed arrives naturally once the fingers stop thinking and simply trust the pattern.",
    "Somewhere between the first word and the last, rhythm takes over, and the sentence seems to write itself faster than the hands that shape it.",
    "Every craft rewards patience before it rewards speed, and typing is no exception, since accuracy today becomes fluency tomorrow.",
    "There is a particular calm in watching a blank line fill with words you chose carefully, each one landing exactly where it belongs.",
    "Practice does not make typing perfect, it makes the mistakes smaller and the corrections quieter until they hardly interrupt the flow at all.",
    "The fastest hands are rarely the tensest ones, since tension slows the fingers while ease lets them glide from key to key without friction.",
    "Learning to type well is less about memorizing a keyboard and more about teaching the hand to trust a rhythm it cannot yet see."
  ];

  const PUNCT_WRAP = ['"', "'"];
  const PUNCT_END = [",", ".", "!", "?", ";", ":"];

  /* ---------------------------------------------------------------- */
  /* state                                                             */
  /* ---------------------------------------------------------------- */

  const state = {
    mode: "time",
    timeValue: 30,
    wordsValue: 25,
    punctuation: false,
    numbers: false,

    targetWords: [],
    typed: [],          // string typed so far per word index
    wordIndex: 0,

    started: false,
    finished: false,
    startTime: 0,
    endTime: 0,
    timeLeft: 30,
    timerId: null,
    sampleId: null,

    keystrokesCorrect: 0,
    keystrokesIncorrect: 0,
    samples: [],         // {t: seconds, correctChars}

    tabArmed: false,
  };

  /* ---------------------------------------------------------------- */
  /* dom refs                                                          */
  /* ---------------------------------------------------------------- */

  const $ = (sel) => document.querySelector(sel);
  const wordsEl = $("#words");
  const typeArea = $("#type-area");
  const hiddenInput = $("#hidden-input");
  const liveStats = $("#live-stats");
  const liveTimer = $("#live-timer");
  const resultsEl = $("#results");
  const restartBtn = $("#restart-btn");
  const nextBtn = $("#next-btn");
  const themeToggle = $("#theme-toggle");
  const valueGroup = $("#value-group");
  const punctBtn = $("#punctuation-btn");
  const numbersBtn = $("#numbers-btn");
  let caretEl = null;

  const VALUE_OPTIONS = {
    time: [15, 30, 60, 120],
    words: [10, 25, 50, 100],
    quote: null,
  };

  /* ---------------------------------------------------------------- */
  /* word generation                                                   */
  /* ---------------------------------------------------------------- */

  function randWord() {
    return WORDS[Math.floor(Math.random() * WORDS.length)];
  }

  function maybeDecorate(word, idx, isSentenceStart) {
    let w = word;
    if (state.numbers && Math.random() < 0.06) {
      w = String(Math.floor(Math.random() * 9000) + 100);
    }
    if (state.punctuation) {
      if (isSentenceStart) w = w[0].toUpperCase() + w.slice(1);
      if (Math.random() < 0.05) {
        const wrap = PUNCT_WRAP[Math.floor(Math.random() * PUNCT_WRAP.length)];
        w = wrap + w + wrap;
      } else if (Math.random() < 0.14) {
        w = w + PUNCT_END[Math.floor(Math.random() * PUNCT_END.length)];
      }
    }
    return w;
  }

  function generateWordList(count) {
    const list = [];
    let sentenceStart = true;
    for (let i = 0; i < count; i++) {
      const w = maybeDecorate(randWord(), i, sentenceStart);
      sentenceStart = /[.!?]$/.test(w);
      list.push(w);
    }
    return list;
  }

  function buildTargets() {
    if (state.mode === "quote") {
      const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
      state.targetWords = q.split(" ");
    } else if (state.mode === "words") {
      state.targetWords = generateWordList(state.wordsValue);
    } else {
      // time mode: generate a generous buffer, extend later if needed
      state.targetWords = generateWordList(120);
    }
  }

  function extendTargetsIfNeeded() {
    if (state.mode === "time" && state.wordIndex > state.targetWords.length - 25) {
      state.targetWords = state.targetWords.concat(generateWordList(60));
      renderWords();
    }
  }

  /* ---------------------------------------------------------------- */
  /* rendering                                                         */
  /* ---------------------------------------------------------------- */

  function renderWords() {
    wordsEl.innerHTML = "";
    state.targetWords.forEach((word, wi) => {
      const wordEl = document.createElement("div");
      wordEl.className = "word";
      wordEl.dataset.index = wi;
      [...word].forEach((ch) => {
        const span = document.createElement("span");
        span.className = "letter";
        span.textContent = ch;
        wordEl.appendChild(span);
      });
      wordsEl.appendChild(wordEl);
    });
    caretEl = document.createElement("div");
    caretEl.className = "caret";
    wordsEl.appendChild(caretEl);
    positionCaret();
  }

  function positionCaret() {
    if (!caretEl) return;
    const wordEl = wordsEl.children[state.wordIndex];
    if (!wordEl) return;
    const typed = state.typed[state.wordIndex] || "";
    let x, y, h;
    const areaRect = wordsEl.getBoundingClientRect();
    if (typed.length === 0) {
      const rect = wordEl.getBoundingClientRect();
      x = rect.left - areaRect.left;
      y = rect.top - areaRect.top;
      h = rect.height;
    } else if (typed.length <= wordEl.children.length) {
      const letterEl = wordEl.children[typed.length - 1];
      const rect = letterEl.getBoundingClientRect();
      x = rect.right - areaRect.left;
      y = rect.top - areaRect.top;
      h = rect.height;
    } else {
      const lastLetter = wordEl.children[wordEl.children.length - 1];
      const rect = lastLetter.getBoundingClientRect();
      x = rect.right - areaRect.left;
      y = rect.top - areaRect.top;
      h = rect.height;
    }
    caretEl.style.left = x + wordsEl.scrollLeft + "px";
    caretEl.style.top = y + "px";
    caretEl.style.height = h + "px";

    // auto-scroll to keep caret within 3 visible lines
    const lineHeight = h * 1.7 / 1; // approx, matches css line-height 1.7 of font-size but h is letter box height
  }

  function renderTyped() {
    [...wordsEl.querySelectorAll(".word")].forEach((wordEl, wi) => {
      const target = state.targetWords[wi];
      const typed = state.typed[wi] || "";
      const letters = wordEl.children;

      for (let i = 0; i < target.length; i++) {
        const span = letters[i];
        span.classList.remove("correct", "incorrect");
        if (i < typed.length) {
          span.classList.add(typed[i] === target[i] ? "correct" : "incorrect");
        }
      }
      // remove old extra spans
      [...wordEl.querySelectorAll(".letter.extra")].forEach((n) => n.remove());
      if (typed.length > target.length) {
        for (let i = target.length; i < typed.length; i++) {
          const span = document.createElement("span");
          span.className = "letter extra";
          span.textContent = typed[i];
          wordEl.appendChild(span);
        }
      }
      wordEl.classList.toggle("current", wi === state.wordIndex);
    });
    positionCaret();
  }

  /* ---------------------------------------------------------------- */
  /* timer / stats                                                     */
  /* ---------------------------------------------------------------- */

  function startTest() {
    state.started = true;
    state.startTime = performance.now();
    typeArea.classList.add("focused");

    if (state.mode === "time") {
      state.timeLeft = state.timeValue;
      liveTimer.textContent = state.timeLeft;
      state.timerId = setInterval(() => {
        state.timeLeft -= 1;
        liveTimer.textContent = Math.max(state.timeLeft, 0);
        if (state.timeLeft <= 0) finishTest();
      }, 1000);
    } else {
      liveTimer.textContent = "0";
      state.timerId = setInterval(() => {
        const elapsed = Math.floor((performance.now() - state.startTime) / 1000);
        liveTimer.textContent = elapsed;
      }, 1000);
    }

    state.sampleId = setInterval(() => {
      const elapsedMin = (performance.now() - state.startTime) / 60000;
      const correct = countCorrectCharsSoFar();
      state.samples.push({ t: elapsedMin, correct });
    }, 500);
  }

  function countCorrectCharsSoFar() {
    let correct = 0;
    for (let wi = 0; wi <= state.wordIndex; wi++) {
      const target = state.targetWords[wi] || "";
      const typed = state.typed[wi] || "";
      for (let i = 0; i < Math.min(target.length, typed.length); i++) {
        if (typed[i] === target[i]) correct++;
      }
      if (wi < state.wordIndex) correct += 1; // space between words counted as a correct char
    }
    return correct;
  }

  function finishTest() {
    if (state.finished) return;
    state.finished = true;
    state.endTime = performance.now();
    clearInterval(state.timerId);
    clearInterval(state.sampleId);
    hiddenInput.blur();
    showResults();
  }

  /* ---------------------------------------------------------------- */
  /* input handling                                                    */
  /* ---------------------------------------------------------------- */

  function currentWordDone() {
    return state.mode !== "time" && state.wordIndex >= state.targetWords.length;
  }

  function handleKeydown(e) {
    if (state.finished) return;

    // tab+enter restart combo
    if (e.key === "Tab") {
      e.preventDefault();
      state.tabArmed = true;
      return;
    }
    if (e.key === "Enter" && state.tabArmed) {
      e.preventDefault();
      resetTest();
      return;
    }
    state.tabArmed = false;

    if (e.key === "Backspace") {
      e.preventDefault();
      const typed = state.typed[state.wordIndex] || "";
      if (typed.length > 0) {
        state.typed[state.wordIndex] = typed.slice(0, -1);
      } else if (state.wordIndex > 0) {
        state.wordIndex -= 1;
      }
      renderTyped();
      return;
    }

    if (e.key === " ") {
      e.preventDefault();
      const typed = state.typed[state.wordIndex] || "";
      if (typed.length === 0) return; // ignore leading spaces
      if (!state.started) startTest();
      state.wordIndex += 1;
      if (state.typed[state.wordIndex] === undefined) state.typed[state.wordIndex] = "";
      extendTargetsIfNeeded();
      renderTyped();
      if (currentWordDone()) finishTest();
      return;
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      if (!state.started) startTest();
      const target = state.targetWords[state.wordIndex] || "";
      const typed = state.typed[state.wordIndex] || "";
      const pos = typed.length;
      if (pos < target.length) {
        if (e.key === target[pos]) state.keystrokesCorrect++;
        else state.keystrokesIncorrect++;
      } else {
        state.keystrokesIncorrect++;
      }
      state.typed[state.wordIndex] = typed + e.key;
      renderTyped();

      // finished the very last word of a fixed-length test by typing full length
      if (state.mode !== "time" && state.wordIndex === state.targetWords.length - 1) {
        const tgt = state.targetWords[state.wordIndex];
        const ty = state.typed[state.wordIndex];
        if (ty.length >= tgt.length && ty === tgt) {
          // allow a beat in case user wants to add trailing chars; finish on next space handled above,
          // but if it's truly the last word, finish immediately once fully correct
          setTimeout(() => {
            if (!state.finished && state.wordIndex === state.targetWords.length - 1) {
              const t2 = state.typed[state.wordIndex];
              if (t2 === state.targetWords[state.wordIndex]) finishTest();
            }
          }, 250);
        }
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* results                                                           */
  /* ---------------------------------------------------------------- */

  function computeFinalStats() {
    let correctChars = 0, incorrectChars = 0, extraChars = 0, missedChars = 0;
    const lastIndex = Math.min(state.wordIndex, state.targetWords.length - 1);
    for (let wi = 0; wi <= lastIndex; wi++) {
      const target = state.targetWords[wi] || "";
      const typed = state.typed[wi] || "";
      for (let i = 0; i < Math.max(target.length, typed.length); i++) {
        const t = target[i], c = typed[i];
        if (t === undefined) extraChars++;
        else if (c === undefined) missedChars++;
        else if (t === c) correctChars++;
        else incorrectChars++;
      }
    }
    const elapsedMs = (state.endTime || performance.now()) - state.startTime;
    const elapsedMin = Math.max(elapsedMs / 60000, 1 / 60);
    const wpm = Math.round((correctChars / 5) / elapsedMin);
    const totalTypedChars = correctChars + incorrectChars + extraChars;
    const rawWpm = Math.round((totalTypedChars / 5) / elapsedMin);
    const totalKeystrokes = state.keystrokesCorrect + state.keystrokesIncorrect;
    const accuracy = totalKeystrokes > 0 ? Math.round((state.keystrokesCorrect / totalKeystrokes) * 100) : 100;

    // consistency: based on variance of per-sample instantaneous wpm
    const wpmSamples = [];
    for (let i = 1; i < state.samples.length; i++) {
      const dt = state.samples[i].t - state.samples[i - 1].t;
      const dc = state.samples[i].correct - state.samples[i - 1].correct;
      if (dt > 0) wpmSamples.push((dc / 5) / dt);
    }
    let consistency = 100;
    if (wpmSamples.length > 1) {
      const mean = wpmSamples.reduce((a, b) => a + b, 0) / wpmSamples.length;
      const variance = wpmSamples.reduce((a, b) => a + (b - mean) ** 2, 0) / wpmSamples.length;
      const sd = Math.sqrt(variance);
      const cv = mean > 0 ? sd / mean : 0;
      consistency = Math.max(0, Math.round(100 - cv * 100));
    }

    return {
      wpm, rawWpm, accuracy, consistency,
      correctChars, incorrectChars, extraChars, missedChars,
      seconds: Math.round(elapsedMs / 1000),
    };
  }

  function showResults() {
    const stats = computeFinalStats();
    typeArea.style.display = "none";
    $(".hint-row").style.display = "none";
    liveStats.style.display = "none";
    resultsEl.hidden = false;

    $("#result-wpm").textContent = stats.wpm;
    $("#result-acc").textContent = stats.accuracy + "%";
    $("#result-raw").textContent = stats.rawWpm;
    $("#result-chars").textContent = `${stats.correctChars}/${stats.incorrectChars}/${stats.extraChars}/${stats.missedChars}`;
    $("#result-consistency").textContent = stats.consistency + "%";
    $("#result-time").textContent = stats.seconds + "s";

    drawChart();
  }

  function drawChart() {
    const canvas = $("#wpm-chart");
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
    const h = 140;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const samples = state.samples;
    if (samples.length < 2) return;

    const points = [];
    for (let i = 1; i < samples.length; i++) {
      const dt = samples[i].t - samples[i - 1].t;
      const dc = samples[i].correct - samples[i - 1].correct;
      const wpm = dt > 0 ? Math.max(0, (dc / 5) / dt) : 0;
      points.push({ x: samples[i].t, wpm });
    }
    const maxWpm = Math.max(...points.map(p => p.wpm), 10);
    const maxT = points[points.length - 1].x || 1;

    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue("--accent").trim();
    const line = styles.getPropertyValue("--line").trim();

    const pad = 24;
    // grid lines
    ctx.strokeStyle = line;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const y = pad + (h - pad * 1.5) * (i / 3);
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(w - 10, y);
      ctx.stroke();
    }

    ctx.beginPath();
    points.forEach((p, i) => {
      const x = pad + (w - pad - 10) * (p.x / maxT);
      const y = h - pad * 0.75 - ((h - pad * 1.5) * (p.wpm / maxWpm));
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.stroke();

    ctx.font = "11px JetBrains Mono, monospace";
    ctx.fillStyle = styles.getPropertyValue("--text-dim").trim();
    ctx.fillText(Math.round(maxWpm) + " wpm", 2, pad);
    ctx.fillText("0", 2, h - pad * 0.75);
  }

  /* ---------------------------------------------------------------- */
  /* reset / mode switching                                            */
  /* ---------------------------------------------------------------- */

  function resetTest() {
    clearInterval(state.timerId);
    clearInterval(state.sampleId);
    state.targetWords = [];
    state.typed = [];
    state.wordIndex = 0;
    state.started = false;
    state.finished = false;
    state.startTime = 0;
    state.endTime = 0;
    state.keystrokesCorrect = 0;
    state.keystrokesIncorrect = 0;
    state.samples = [];
    state.tabArmed = false;

    typeArea.style.display = "";
    $(".hint-row").style.display = "";
    liveStats.style.display = "";
    resultsEl.hidden = true;
    typeArea.classList.remove("focused");

    buildTargets();
    renderWords();
    renderValueGroup();

    if (state.mode === "time") {
      state.timeLeft = state.timeValue;
      liveTimer.textContent = state.timeLeft;
    } else {
      liveTimer.textContent = "0";
    }

    hiddenInput.value = "";
    hiddenInput.focus();
  }

  function renderValueGroup() {
    valueGroup.innerHTML = "";
    const opts = VALUE_OPTIONS[state.mode];
    if (!opts) {
      const span = document.createElement("span");
      span.className = "control-btn active";
      span.textContent = "random";
      valueGroup.appendChild(span);
      return;
    }
    const current = state.mode === "time" ? state.timeValue : state.wordsValue;
    opts.forEach((val) => {
      const btn = document.createElement("button");
      btn.className = "control-btn" + (val === current ? " active" : "");
      btn.textContent = val;
      btn.addEventListener("click", () => {
        if (state.mode === "time") state.timeValue = val;
        else state.wordsValue = val;
        resetTest();
      });
      valueGroup.appendChild(btn);
    });
  }

  /* ---------------------------------------------------------------- */
  /* event wiring                                                      */
  /* ---------------------------------------------------------------- */

  document.querySelectorAll("#mode-group .control-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#mode-group .control-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.mode = btn.dataset.mode;
      resetTest();
    });
  });

  punctBtn.addEventListener("click", () => {
    state.punctuation = !state.punctuation;
    punctBtn.classList.toggle("on", state.punctuation);
    resetTest();
  });
  numbersBtn.addEventListener("click", () => {
    state.numbers = !state.numbers;
    numbersBtn.classList.toggle("on", state.numbers);
    resetTest();
  });

  typeArea.addEventListener("click", () => hiddenInput.focus());
  hiddenInput.addEventListener("focus", () => typeArea.classList.add("focused"));
  hiddenInput.addEventListener("blur", () => { if (!state.finished) typeArea.classList.remove("focused"); });
  hiddenInput.addEventListener("keydown", handleKeydown);

  restartBtn.addEventListener("click", resetTest);
  nextBtn.addEventListener("click", resetTest);

  window.addEventListener("resize", () => { positionCaret(); if (!resultsEl.hidden) drawChart(); });

  // global tab+enter restart even when not focused on input
  document.addEventListener("keydown", (e) => {
    if (document.activeElement === hiddenInput) return;
    if (e.key === "Tab") { e.preventDefault(); state.tabArmed = true; }
    else if (e.key === "Enter" && state.tabArmed) { resetTest(); }
    else { state.tabArmed = false; }
  });

  /* ---------------------------------------------------------------- */
  /* theme                                                             */
  /* ---------------------------------------------------------------- */

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    themeToggle.textContent = theme === "light" ? "◑" : "◐";
    try { localStorage.setItem("typeflow-theme", theme); } catch (e) {}
  }
  themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    applyTheme(current);
  });
  (function initTheme() {
    let saved = "dark";
    try { saved = localStorage.getItem("typeflow-theme") || "dark"; } catch (e) {}
    applyTheme(saved);
  })();

  /* ---------------------------------------------------------------- */
  /* init                                                              */
  /* ---------------------------------------------------------------- */

  renderValueGroup();
  buildTargets();
  renderWords();
  hiddenInput.focus();
})();
