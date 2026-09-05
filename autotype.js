/*
 * autotype.js
 * ---------------------------------------------------------------
 * Idle "demo mode" for typeflow.
 *
 * Updates:
 * 1. Fires 'keydown', 'keypress', and 'input' events to mimic real input.
 * 2. Uses KeyboardEvent.code (e.g., "KeyA", "Space") for realism.
 * 3. Ensures 'input' events have correct 'data' property.
 * 4. Adds human-like timing jitter.
 *
 * Note: isTrusted will still be false for synthetic events.
 * If you need isTrusted=true, you must use a helper iframe or
 * window.open() to dispatch events from a different context.
 * ---------------------------------------------------------------
 */

(() => {
  "use strict";

  const MIN_DELAY_MS = 10000;
  const MAX_DELAY_MS = 25000;

  // Human-like typing speeds (ms)
  const MIN_KEY_INTERVAL_MS = 40;
  const MAX_KEY_INTERVAL_MS = 150;
  const WORD_PAUSE_MS = 100; // Pause between words
  const TYPING_PAUSE_MS = 200; // Extra pause occasionally to simulate thinking

  let cancelled = false;

  function randBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function markCancelled() {
    if (!cancelled) cancelled = true;
  }

  // Listen for real user input to cancel autotype
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

  // Helper to get KeyboardEvent.code for a key
  function getKeyCode(key) {
    if (key === " ") return "Space";
    if (key.length === 1) return `Key${key.toUpperCase()}`;
    return key; // Fallback for special keys if needed
  }

  function dispatchKey(key) {
    const input = document.getElementById("hidden-input");
    if (!input) return;

    const keyCode = getKeyCode(key);

    // 1. KeyDown Event
    const keyDownEvent = new KeyboardEvent("keydown", {
      key,
      code: keyCode,
      keyCode: key === " " ? 32 : key.charCodeAt(0), // 32 for space, char code for letters
      bubbles: true,
      cancelable: true,
      composed: true, // Important for shadow DOM compatibility
    });
    input.dispatchEvent(keyDownEvent);

    // 2. Keypress Event (older browsers still listen to this)
    const keyPressEvent = new KeyboardEvent("keypress", {
      key,
      code: keyCode,
      keyCode: key === " " ? 32 : key.charCodeAt(0),
      bubbles: true,
      cancelable: true,
      composed: true,
    });
    input.dispatchEvent(keyPressEvent);

    // 3. Input Event (critical for modern frameworks)
    const inputEvent = new InputEvent("input", {
      bubbles: true,
      cancelable: true,
      data: key,
      inputType: "insertText",
      composed: true,
    });
    input.dispatchEvent(inputEvent);

    // Optional: Dispatch 'beforeinput' for completeness
    const beforeInputEvent = new InputEvent("beforeinput", {
      bubbles: true,
      cancelable: true,
      data: key,
      inputType: "insertText",
      composed: true,
    });
    input.dispatchEvent(beforeInputEvent);
  }

  function focusInput() {
    const input = document.getElementById("hidden-input");
    if (input) {
      input.focus();
      // Simulate a cursor blink or focus ring if needed by your UI
      // input.style.outline = "none"; // Remove default outline if needed
    }
  }

  function typeWord(word, charIndex, wordIndex, onWordDone) {
    if (cancelled || resultsAreShowing()) return;

    if (charIndex < word.length) {
      dispatchKey(word[charIndex]);

      // Add some randomness to the delay to simulate human typing
      const delay = randBetween(MIN_KEY_INTERVAL_MS, MAX_KEY_INTERVAL_MS);
      
      // Occasional longer pause (thinking)
      const finalDelay = Math.random() < 0.05 
        ? delay + randBetween(100, 300) 
        : delay;

      setTimeout(
        () => typeWord(word, charIndex + 1, wordIndex, onWordDone),
        finalDelay
      );
    } else {
      // Type space
      dispatchKey(" ");
      
      // Pause after word
      setTimeout(onWordDone, WORD_PAUSE_MS + randBetween(0, 100));
    }
  }

  function typeFromWordIndex(wordIndex) {
    if (cancelled || resultsAreShowing()) return;

    const wordEls = getWordElements();

    if (wordIndex >= wordEls.length) {
      // Wait for more words to appear
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
