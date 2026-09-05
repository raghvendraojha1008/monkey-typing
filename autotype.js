/*
 * autotype.js
 * ---------------------------------------------------------------
 * Idle "demo mode" for typeflow.
 *
 * On every page load/refresh, waits a random 10–25s. If the visitor
 * hasn't touched the keyboard or mouse by then, it automatically
 * types out the words currently on screen — as if a fast, calm
 * typist were demoing the test for them.
 *
 * The moment a real (trusted) keydown/mousedown/touchstart happens,
 * autotype cancels itself for the rest of the session so it never
 * fights a real user.
 *
 * This file is fully independent of script.js: it doesn't read or
 * modify any internal state, it only reads the words rendered in
 * the DOM and dispatches synthetic keydown events at the same
 * hidden input the real typing engine already listens to.
 * ---------------------------------------------------------------
 */

(() => {
  "use strict";

  const MIN_DELAY_MS = 10000;
  const MAX_DELAY_MS = 25000;

  const MIN_KEY_INTERVAL_MS = 55;
  const MAX_KEY_INTERVAL_MS = 140;
  const WORD_PAUSE_MS = 90; // small extra pause after the space between words

  let cancelled = false;

  function randBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function markCancelled() {
    if (!cancelled) cancelled = true;
  }

  // Any real user input, ever, permanently disables autotype for this load.
  ["keydown", "mousedown", "touchstart", "pointerdown"].forEach((evt) => {
    document.addEventListener(
      evt,
      (e) => {
        if (e.isTrusted) markCancelled();
      },
      { capture: true, passive: true }
    );
  });

  function resultsAreShowing() {
    const results = document.getElementById("results");
    return results && !results.hidden;
  }

  function getWordElements() {
    const wordsEl = document.getElementById("words");
    if (!wordsEl) return [];
    return [...wordsEl.querySelectorAll(".word")];
  }

  function getWordText(wordEl) {
    return [...wordEl.querySelectorAll(".letter")]
      .filter((el) => !el.classList.contains("extra"))
      .map((el) => el.textContent)
      .join("");
  }

  function dispatchKey(key) {
    const input = document.getElementById("hidden-input");
    if (!input) return;
    const event = new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(event);
  }

  function focusInput() {
    const input = document.getElementById("hidden-input");
    if (input) input.focus();
  }

  function typeWord(word, charIndex, wordIndex, onWordDone) {
    if (cancelled || resultsAreShowing()) return;

    if (charIndex < word.length) {
      dispatchKey(word[charIndex]);
      setTimeout(
        () => typeWord(word, charIndex + 1, wordIndex, onWordDone),
        randBetween(MIN_KEY_INTERVAL_MS, MAX_KEY_INTERVAL_MS)
      );
    } else {
      dispatchKey(" ");
      setTimeout(onWordDone, WORD_PAUSE_MS + randBetween(0, 60));
    }
  }

  function typeFromWordIndex(wordIndex) {
    if (cancelled || resultsAreShowing()) return;

    const wordEls = getWordElements();

    if (wordIndex >= wordEls.length) {
      // More words may still be generated (time mode extends the list
      // as you go) — wait briefly and re-check rather than giving up.
      setTimeout(() => typeFromWordIndex(wordIndex), 200);
      return;
    }

    const word = getWordText(wordEls[wordIndex]);
    typeWord(word, 0, wordIndex, () => typeFromWordIndex(wordIndex + 1));
  }

  function startAutotype() {
    if (cancelled || resultsAreShowing()) return;
    focusInput();
    typeFromWordIndex(0);
  }

  function scheduleAutotype() {
    const delay = randBetween(MIN_DELAY_MS, MAX_DELAY_MS);
    setTimeout(() => {
      if (!cancelled) startAutotype();
    }, delay);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleAutotype);
  } else {
    scheduleAutotype();
  }
})();
